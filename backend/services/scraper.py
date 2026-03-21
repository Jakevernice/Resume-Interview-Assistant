import asyncio
from playwright.async_api import async_playwright

async def scrape_job_description(url: str) -> str:
    """
    Scrapes a job description from a given URL using Playwright.
    Targets specific common selectors to minimize noise.
    """
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
                            break # Found a substantial block
                except:
                    continue

            # Final fallback: generic body text if no specific selector matched
            if not content.strip():
                content = await page.inner_text("body")

            return content.strip()

        except Exception as e:
            return f"Error scraping URL: {str(e)}"
        finally:
            await browser.close()
