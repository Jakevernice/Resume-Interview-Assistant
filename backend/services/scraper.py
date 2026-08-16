import asyncio
import ipaddress
import logging
import socket
from urllib.parse import urlparse
from playwright.async_api import async_playwright

logger = logging.getLogger("scraper_service")


def validate_public_url(url_str: str) -> None:
    """
    Validates that a URL uses HTTP/HTTPS and does not point to internal,
    private, loopback, link-local, or cloud metadata addresses (SSRF protection).
    """
    if not url_str or not isinstance(url_str, str):
        raise ValueError("URL must be a non-empty string.")

    parsed = urlparse(url_str.strip())
    if parsed.scheme.lower() not in ("http", "https"):
        raise ValueError("Only HTTP and HTTPS URLs are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: missing hostname.")

    try:
        addr_infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve host: {hostname}") from exc

    if not addr_infos:
        raise ValueError(f"No IP addresses resolved for host: {hostname}")

    for addr_info in addr_infos:
        ip_str = addr_info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            raise ValueError(f"Invalid IP address resolved: {ip_str}")

        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise ValueError(
                f"Access to internal or restricted network address is blocked."
            )


async def scrape_job_description(url: str) -> str:
    """
    Scrapes a job description from a given URL using Playwright.
    Targets specific common selectors to minimize noise.
    """
    validate_public_url(url)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Modern browser UA
        await page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        })

        try:
            # Increased timeout for complex job boards
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)

            # Common job description selectors for major platforms
            selectors = [
                ".description",                    # LinkedIn
                "#jobDescriptionText",            # Indeed
                ".job-description",               # Generic
                "[class*='JobDescription']",      # React-style names
                ".show-more-less-html__markup",   # Alternative LinkedIn
                "article",                        # Semantic HTML
                "main"                            # Fallback
            ]

            content = ""
            for selector in selectors:
                try:
                    # Wait for the selector to be present
                    element = await page.wait_for_selector(selector, timeout=5000)
                    if element:
                        content = await element.inner_text()
                        if len(content.strip()) > 200:
                            break  # Found a substantial block
                except Exception:
                    continue

            # Final fallback: generic body text if no specific selector matched
            if not content.strip():
                content = await page.inner_text("body")

            trimmed = content.strip()
            if not trimmed:
                raise ValueError("No readable content could be extracted from the specified URL.")

            return trimmed

        except ValueError:
            raise
        except Exception as e:
            logger.warning("Scraping failed for URL: %s", str(e))
            raise ValueError(f"Failed to scrape job description from URL: {str(e)}") from e
        finally:
            await browser.close()

