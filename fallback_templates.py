ROLE_TEMPLATES = {
    "Backend Developer": """# 💻 Technical Questions for Backend Developer
1. Explain your experience with database design and optimization
2. Describe microservices architecture you've implemented
3. How do you handle API security and authentication?
4. Discuss scalability and performance optimization

# 🔧 Coding Challenges
1. Implement a Rate Limiter
```python
class RateLimiter:
    def __init__(self, capacity, time_window):
        self.capacity = capacity
        self.time_window = time_window
        self.requests = []
        self.lock = threading.Lock()
    def is_allowed(self):
        with self.lock:
            now = time.time()
            # Remove old requests
            self.requests = [req for req in self.requests 
                           if now - req < self.time_window]
            if len(self.requests) < self.capacity:
                self.requests.append(now)
                return True
            return False
    Design a Connection Pool
    Implement a Caching System
🏗️ System Design Questions
    Design a distributed message queue
    Implement a scalable database architecture
    Create a microservices system
    Design an authentication service
📚 Key Concepts
    Backend Architecture
        API Design
        Database Optimization
        Caching Strategies
    System Infrastructure
        Microservices
        Load Balancing
        Service Discovery
    Security & Performance
        Authentication/Authorization
        Rate Limiting
        Performance Monitoring

✅ Preparation Steps
    Practice Backend Skills
        Build RESTful APIs
        Implement authentication
        Design databases

    Study Distributed Systems
        Message queues
        Caching systems
        Load balancing

    Review System Design
        Scalability patterns
        Database sharding
        Microservices architecture""",

    "Frontend Developer": """# 💻 Technical Questions for Frontend Developer

    Explain your experience with modern frontend frameworks
    Describe state management solutions you've implemented
    How do you optimize client-side performance?
    Discuss responsive design and accessibility
🔧 Coding Challenges

    Implement a Custom React Hook
JAVASCRIPT
function useDataFetching(url) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch(url);
                const json = await response.json();
                setData(json);
                setLoading(false);
            } catch (err) {
                setError(err);
                setLoading(false);
            }
        }
        fetchData();
    }, [url]);
    return { data, loading, error };
}
    Create a Responsive Grid System
    Build a Form Validation System
🏗️ System Design Questions
    Design a component library
    Implement state management
    Create a routing system
    Design a real-time dashboard

📚 Key Concepts
    Frontend Architecture
        Component Design
        State Management
        Performance Optimization
    Modern Web Technologies
        ES6+ Features
        Web APIs
        Browser Storage
    UI/UX Principles
        Responsive Design
        Accessibility
        Cross-browser Compatibility

✅ Preparation Steps

    Practice Frontend Skills
        Build reusable components
        Implement common patterns
        Master CSS layouts

    Study Modern Web Development
        Learn latest JavaScript features
        Understand browser APIs
        Practice responsive design

    Review System Design
        Component architecture
        State management patterns
        Performance optimization""",

    "Full Stack Developer": """# 💻 Technical Questions for Full Stack Developer

    Explain your full-stack development experience

    Describe end-to-end application architecture

    How do you handle data flow between frontend and backend?

    Discuss deployment and DevOps practices

🔧 Coding Challenges

    Implement a Full Stack Feature

Python

# Backend (FastAPI)

@app.post("/api/items")

async def create_item(item: Item):

    result = await db.items.insert_one(item.dict())

    return {"id": str(result.inserted_id)}


# Frontend (React)

function ItemCreator() {

    const [item, setItem] = useState({});

    

    const handleSubmit = async () => {

        const response = await fetch('/api/items', {

            method: 'POST',

            body: JSON.stringify(item)

        });

        const data = await response.json();

        console.log('Created:', data);

    };

    

    return (

        <form onSubmit={handleSubmit}>

            {/* Form fields */}

        </form>

    );

}

    Design a Database Schema
    Create an Authentication System

🏗️ System Design Questions

    Design a full-stack application
    Implement CI/CD pipeline
    Create a scalable architecture
    Design a monitoring system

📚 Key Concepts

    Full Stack Architecture
        Frontend Development
        Backend Systems
        Database Design
    DevOps & Deployment
        CI/CD Pipelines
        Container Orchestration
        Cloud Services
    Security & Performance
        End-to-end Security
        Performance Optimization
        Monitoring & Logging

✅ Preparation Steps

    Practice Full Stack Skills
        Build complete applications
        Implement authentication
        Design databases
    Study Modern Technologies
        Frontend frameworks
        Backend systems
        Database management
    Review System Design
        Application architecture
        Deployment strategies
        Scaling patterns"""
}

def generate_dynamic_template(role: str) -> str:
    """Generate a template for roles not in predefined templates"""

    # Common skills and concepts for different role types
    role_patterns = {
        "Data Scientist": {
            "skills": ["Python", "R", "SQL", "Machine Learning", "Statistical Analysis"],
            "tools": ["Pandas", "Scikit-learn", "TensorFlow", "PyTorch", "Jupyter"],
            "concepts": ["Machine Learning", "Statistical Modeling", "Data Visualization", "Feature Engineering"],
            "challenges": ["Model Implementation", "Data Pipeline Design", "Feature Selection"],
            "code_example": """```python
class ModelPipeline:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()

    def preprocess(self, data):
        return self.scaler.fit_transform(data)

    def train(self, X, y):
        X_scaled = self.preprocess(X)
        self.model = RandomForestClassifier()
        self.model.fit(X_scaled, y)
```""",
        },
        "DevOps Engineer": {
            "skills": ["CI/CD", "Docker", "Kubernetes", "Cloud Platforms", "Infrastructure as Code"],
            "tools": ["Jenkins", "AWS/Azure/GCP", "Terraform", "Ansible", "Git"],
            "concepts": ["Container Orchestration", "Infrastructure Automation", "Monitoring", "Security"],
            "challenges": ["Pipeline Implementation", "Infrastructure Setup", "Monitoring System"],
            "code_example": """```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=db
    depends_on:
      - db
  db:
    image: postgres:13
    volumes:
      - db_data:/var/lib/postgresql/data
```""",
        },
        "QA Engineer": {
            "skills": ["Test Automation", "API Testing", "Performance Testing", "Test Planning"],
            "tools": ["Selenium", "JUnit/PyTest", "Postman", "JMeter"],
            "concepts": ["Test Methodologies", "CI/CD Integration", "Test Coverage", "Bug Tracking"],
            "challenges": ["Test Framework Design", "Automation Script", "Test Strategy"],
            "code_example": """```python
class TestLoginFeature(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.get("http://example.com")

    def test_valid_login(self):
        login_page = LoginPage(self.driver)
        dashboard = login_page.login("user", "pass")
        self.assertTrue(dashboard.is_loaded())
```""",
        },
        "Mobile Developer": {
            "skills": ["iOS/Android Development", "Cross-platform Development", "Mobile UI/UX", "API Integration"],
            "tools": ["Swift/Kotlin", "React Native/Flutter", "Xcode/Android Studio", "Firebase"],
            "concepts": ["Mobile Architecture", "State Management", "Native Features", "Performance"],
            "challenges": ["UI Implementation", "State Management", "Native Integration"],
            "code_example": """```swift
class HomeViewController: UIViewController {
    private let viewModel: HomeViewModel

    private lazy var tableView: UITableView = {
        let table = UITableView()
        table.delegate = self
        table.dataSource = self
        return table
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        bindViewModel()
    }
}
```""",
        }
    }

    # Default pattern for unknown roles
    default_pattern = {
        "skills": ["Software Development", "Problem Solving", "System Design", "Testing"],
        "tools": ["Relevant IDEs", "Version Control", "Project Management Tools"],
        "concepts": ["Software Architecture", "Best Practices", "Design Patterns"],
        "challenges": ["Implementation", "System Design", "Problem Solving"],
        "code_example": """```python
class Solution:
    def implement_feature(self):
        # Feature implementation
        pass

    def handle_edge_cases(self):
        # Edge case handling
        pass
```""",
    }

    # Get the appropriate pattern or use default
    pattern = role_patterns.get(role, default_pattern)

    # Generate the template
    return f"""# 💻 Technical Questions for {role}

1. Explain your experience with {', '.join(pattern['skills'][:3])}
2. Describe {pattern['concepts'][0]} solutions you've implemented
3. How do you approach {pattern['concepts'][1]}?
4. Discuss {pattern['concepts'][2]} principles

# 🔧 Coding Challenges

1. Implementation Challenge

{pattern['code_example']}

2. Design a {pattern['challenges'][1]}
3. Create a {pattern['challenges'][2]} solution

# 🏗️ System Design Questions

1. Design a scalable system for {pattern['challenges'][0]}
2. Implement {pattern['concepts'][1]} strategy
3. Create an efficient {pattern['challenges'][2]} system
4. Handle edge cases and optimization

# 📚 Key Concepts

1. Core Skills
   - {pattern['skills'][0]}
   - {pattern['skills'][1]}
   - {pattern['skills'][2]}

2. Tools & Technologies
   - {pattern['tools'][0]}
   - {pattern['tools'][1]}
   - {pattern['tools'][2]}

3. Best Practices
   - {pattern['concepts'][0]}
   - {pattern['concepts'][1]}
   - {pattern['concepts'][2]}

# ✅ Preparation Steps

1. Practice Core Skills
   - Build sample projects
   - Implement common patterns
   - Master key technologies

2. Study {role} Fundamentals
   - Learn latest practices
   - Understand core concepts
   - Practice problem-solving

3. Review System Design
   - Architecture patterns
   - Best practices
   - Performance optimization"""

def get_role_template(role: str) -> str:
    """Get the template for a specific role"""
    if role in ROLE_TEMPLATES:
        return ROLE_TEMPLATES[role]
    return generate_dynamic_template(role)