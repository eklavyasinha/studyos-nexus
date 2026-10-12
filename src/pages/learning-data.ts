import type { Item } from "../lib/types";

export type LearningDomain = "java" | "dsa" | "cp" | "web";
export const TOPIC_STATES = [
  "not started",
  "learning",
  "practicing",
  "revising",
  "mastered",
];
export const PROBLEM_STATES = [
  "not started",
  "attempted",
  "solved",
  "revising",
  "revised",
];
export const PRACTICE_STATES = [
  "planned",
  "attempted",
  "completed",
  "needs review",
];
export const CONTEST_STATES = ["planned", "registered", "completed", "missed"];
export const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export const DOMAIN_INFO = {
  java: {
    title: "The Java lab",
    eyebrow: "LEARN THE LANGUAGE",
    description:
      "From your first class to confident, idiomatic Java. Make the knowledge yours.",
    number: "01",
    route: "java",
    defaultTab: "roadmap",
    accent: "orange",
    tabs: [
      { id: "roadmap", label: "Roadmap" },
      { id: "snippets", label: "Snippet library" },
      { id: "practice", label: "Practice & mistakes" },
    ],
  },
  dsa: {
    title: "Think in algorithms.",
    eyebrow: "DATA STRUCTURES & ALGORITHMS",
    description:
      "Understand the pattern. Solve with intention. Come back until it clicks.",
    number: "02",
    route: "dsa",
    defaultTab: "problems",
    accent: "lime",
    tabs: [
      { id: "problems", label: "Problem tracker" },
      { id: "roadmap", label: "Roadmap" },
      { id: "revisions", label: "Revision queue" },
      { id: "calendar", label: "Practice calendar" },
    ],
  },
  cp: {
    title: "The competitive edge",
    eyebrow: "COMPETITIVE PROGRAMMING",
    description:
      "Plan the contest. Learn from the result. Turn every upsolve into progress.",
    number: "03",
    route: "competitive",
    defaultTab: "contests",
    accent: "violet",
    tabs: [
      { id: "contests", label: "Contests" },
      { id: "practice", label: "Practice & upsolve" },
      { id: "roadmap", label: "Roadmap" },
      { id: "goals", label: "Weekly goals" },
      { id: "schedule", label: "Practice schedule" },
    ],
  },
  web: {
    title: "Make something real.",
    eyebrow: "WEB DEVELOPMENT",
    description:
      "A place for useful patterns, small experiments, and projects that leave the notebook.",
    number: "04",
    route: "web",
    defaultTab: "playground",
    accent: "blue",
    tabs: [
      { id: "playground", label: "Playground" },
      { id: "snippets", label: "Snippets & patterns" },
      { id: "roadmap", label: "Roadmap" },
      { id: "projects", label: "Projects" },
    ],
  },
} as const;

type CurriculumGroup = {
  name: string;
  url: string;
  topics: [string, string, string][];
};
const JAVA = "https://dev.java/learn/";
const DSA = "https://cp-algorithms.com/";
const MDN = "https://developer.mozilla.org/en-US/docs/Learn_web_development";

const CURRICULUM: Record<LearningDomain, CurriculumGroup[]> = {
  java: [
    {
      name: "Language foundations",
      url: JAVA,
      topics: [
        [
          "JDK, JVM & your first program",
          "Understand source code, bytecode, the JVM, and how a Java program starts.",
          'class Main { public static void main(String[] args) { System.out.println("Hello, Java"); } }',
        ],
        [
          "Variables, types & operators",
          "Use primitive and reference types, numeric conversions, constants, and operators deliberately.",
          "int count = 3;\ndouble average = total / (double) count;\nfinal int LIMIT = 100;",
        ],
        [
          "Conditionals & loops",
          "Choose branches with if or switch and repeat work with for, while, and enhanced for.",
          "for (int value : values) {\n  if (value > 0) System.out.println(value);\n}",
        ],
        [
          "Methods & scope",
          "Break work into methods and understand parameters, return values, scope, and pass-by-value.",
          "static int square(int n) { return n * n; }",
        ],
        [
          "Arrays & multidimensional arrays",
          "Use fixed-size, zero-indexed sequences and reason about array bounds and nested arrays.",
          "int[][] grid = new int[3][4];\ngrid[0][0] = 1;",
        ],
        [
          "Recursion & the call stack",
          "Identify a base case, reduce the problem, and trace stack frames. Compare recursion with iteration and know when stack depth matters.",
          "static long factorial(int n) {\n  if (n < 0) throw new IllegalArgumentException();\n  return n <= 1 ? 1 : n * factorial(n - 1);\n}",
        ],
        [
          "Java for DSA · a practical checklist",
          "- [ ] Read input with buffered I/O\n- [ ] Know array and String APIs\n- [ ] Use ArrayDeque for stacks and queues\n- [ ] Use HashMap for frequency tables\n- [ ] Define comparators for sorting and heaps\n- [ ] Understand overflow and long arithmetic\n- [ ] State the complexity of each solution\n- [ ] Test empty, singleton, duplicate, and large inputs",
          "long product = 1L * a * b; // promote before multiplication\nvar heap = new java.util.PriorityQueue<Integer>();",
        ],
        [
          "Strings & StringBuilder",
          "Work with immutable strings, equality, substring operations, and efficient string construction.",
          'StringBuilder out = new StringBuilder();\nout.append("answer: ").append(42);',
        ],
        [
          "Input, output & formatting",
          "Read input, format output, and select buffered I/O when many values are involved.",
          "var reader = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));",
        ],
        [
          "Packages, imports & modules",
          "Organize code into named packages, keep dependencies explicit, and understand Java module boundaries.",
          "package study.notes;\nimport java.util.List;",
        ],
      ],
    },
    {
      name: "Object-oriented Java",
      url: `${JAVA}classes-objects/`,
      topics: [
        [
          "Classes, objects & constructors",
          "Represent state and behavior with classes and initialize valid objects with constructors.",
          "class Point {\n  final int x;\n  Point(int x) { this.x = x; }\n}",
        ],
        [
          "Encapsulation & access modifiers",
          "Keep invariants inside a class and expose only the operations callers need.",
          "private int balance;\npublic int getBalance() { return balance; }",
        ],
        [
          "Inheritance & polymorphism",
          "Distinguish an object’s runtime type from its reference type and use overridden behavior.",
          "List<String> names = new ArrayList<>();",
        ],
        [
          "Interfaces & abstract classes",
          "Express capabilities with interfaces and share implementation only when it is meaningful.",
          "interface Printable { void print(); }",
        ],
        [
          "Records, enums & sealed types",
          "Model small immutable data carriers, fixed choices, and restricted hierarchies.",
          "record Point(int x, int y) {}\nenum State { READY, RUNNING, DONE }",
        ],
        [
          "equals, hashCode & toString",
          "Keep logical equality consistent with hashing and produce useful object descriptions.",
          "record UserId(String value) {} // value-based equality",
        ],
        [
          "Composition & design principles",
          "Prefer small responsibilities and object composition over unnecessarily deep inheritance.",
          "class Service {\n  private final Repository repository;\n  Service(Repository r) { repository = r; }\n}",
        ],
      ],
    },
    {
      name: "Collections & functional Java",
      url: `${JAVA}api/collections-framework/`,
      topics: [
        [
          "Generics & wildcards",
          "Write reusable, type-safe APIs and understand bounded types and producer/consumer variance.",
          "static <T> T first(List<T> values) { return values.get(0); }",
        ],
        [
          "List, Set & Map",
          "Choose collection semantics for ordered values, unique values, or key-value lookup.",
          'Map<String, Integer> counts = new HashMap<>();\ncounts.merge("java", 1, Integer::sum);',
        ],
        [
          "Queue, Deque & PriorityQueue",
          "Use FIFO queues, double-ended queues, and heaps for the right access patterns.",
          "Deque<Integer> stack = new ArrayDeque<>();\nstack.push(1);\nint top = stack.pop();",
        ],
        [
          "Comparable & Comparator",
          "Define natural ordering or independent comparison strategies with consistent contracts.",
          "people.sort(Comparator.comparing(Person::name));",
        ],
        [
          "Lambdas & functional interfaces",
          "Pass behavior as values with small functions and standard functional interfaces.",
          "Predicate<Integer> even = n -> n % 2 == 0;",
        ],
        [
          "Streams & collectors",
          "Build readable data pipelines and understand lazy intermediate and terminal operations.",
          "var names = users.stream().map(User::name).sorted().toList();",
        ],
        [
          "Optional & null handling",
          "Represent an absent result explicitly and avoid unsafe assumptions about nullable data.",
          'String label = possibleName.orElse("Untitled");',
        ],
      ],
    },
    {
      name: "Reliable applications",
      url: JAVA,
      topics: [
        [
          "Exceptions & resource management",
          "Distinguish checked and unchecked failures and always close owned resources.",
          "try (var reader = Files.newBufferedReader(path)) {\n  System.out.println(reader.readLine());\n}",
        ],
        [
          "Files, NIO & serialization",
          "Read and write text and binary data while considering encodings and safe formats.",
          'String text = Files.readString(Path.of("notes.txt"));',
        ],
        [
          "Date & time API",
          "Choose LocalDate, Instant, or ZonedDateTime according to the meaning of a time value.",
          "LocalDate nextReview = LocalDate.now().plusDays(7);",
        ],
        [
          "Threads, executors & concurrency",
          "Understand task execution, race conditions, locks, thread safety, and virtual threads.",
          "try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {\n  pool.submit(() -> process());\n}",
        ],
        [
          "JVM memory & garbage collection",
          "Reason about references, stack frames, heap allocation, garbage collection, and memory leaks.",
          "A reachable object stays alive; retaining an unused collection can retain all of its elements.",
        ],
        [
          "JUnit & debugging",
          "Test behavior and edge cases; use breakpoints and stack traces to explain failures.",
          "@Test void squaresPositiveInput() { assertEquals(9, square(3)); }",
        ],
        [
          "Maven, Gradle & dependencies",
          "Use repeatable builds and understand dependency scopes, versions, and project structure.",
          "Keep production code in src/main/java and tests in src/test/java.",
        ],
        [
          "Annotations & reflection",
          "Understand metadata, annotation processing, and runtime inspection without relying on unnecessary reflection.",
          '@Override\npublic String toString() { return "A useful description"; }',
        ],
        [
          "JDBC & database access",
          "Use parameterized queries, transactions, and properly closed database resources.",
          'var statement = connection.prepareStatement("SELECT name FROM users WHERE id = ?");',
        ],
        [
          "HTTP clients & REST",
          "Model requests and responses and handle network failures, timeouts, and status codes.",
          'HttpRequest.newBuilder(URI.create("https://example.com")).GET().build();',
        ],
        [
          "Spring Boot foundations",
          "Understand dependency injection, controllers, services, and configuration in a Java web app.",
          '@RestController\nclass HealthController { @GetMapping("/health") String health() { return "ok"; } }',
        ],
      ],
    },
  ],
  dsa: [
    {
      name: "Foundations & linear structures",
      url: DSA,
      topics: [
        [
          "Time & space complexity",
          "Analyze how resource use grows with input size, including worst-case and amortized costs.",
          "A scan over n values is O(n); nested full scans are O(n²).",
        ],
        [
          "Arrays & matrices",
          "Use indexed storage and handle boundaries, in-place updates, and grid traversal.",
          "Rotate a square matrix by transposing, then reversing each row.",
        ],
        [
          "Strings & character frequency",
          "Reason about character sets, substrings, normalization, and frequency tables.",
          "Two strings are anagrams when their character frequencies match.",
        ],
        [
          "Hashing & frequency maps",
          "Trade extra memory for efficient lookup; account for collisions and expected complexity.",
          "For two-sum, look up target − value before inserting the current value.",
        ],
        [
          "Linked lists",
          "Manipulate links carefully using sentinel nodes, slow/fast pointers, and reversal.",
          "Reverse a list by saving next, redirecting current.next, then advancing.",
        ],
        [
          "Stacks & queues",
          "Use LIFO or FIFO order to model pending work and preserve invariants.",
          "Match brackets with a stack of unmatched opening brackets.",
        ],
        [
          "Monotonic stacks & deques",
          "Maintain a useful ordering to discard candidates that can never become optimal.",
          "A decreasing deque can track the maximum in a sliding window.",
        ],
        [
          "Prefix sums & difference arrays",
          "Precompute cumulative values or defer range updates to speed up repeated operations.",
          "sum(l, r) = prefix[r + 1] − prefix[l].",
        ],
      ],
    },
    {
      name: "Core problem-solving patterns",
      url: DSA,
      topics: [
        [
          "Two pointers",
          "Move pointers under a clear invariant instead of checking every pair.",
          "In a sorted array, move the left pointer when the pair sum is too small.",
        ],
        [
          "Sliding window",
          "Maintain a contiguous range while updating its summary as boundaries change.",
          "Shrink the left boundary until the window again contains at most k distinct values.",
        ],
        [
          "Sorting & custom ordering",
          "Use sorting to expose structure; understand stable ordering and comparison costs.",
          "Sort intervals by start, then merge those that overlap.",
        ],
        [
          "Binary search & search on answer",
          "Use a monotonic condition with explicit search bounds and termination rules.",
          "Find the smallest feasible capacity using a canShip(capacity) predicate.",
        ],
        [
          "Recursion & divide-and-conquer",
          "Specify base cases, shrinking subproblems, and how results combine.",
          "Merge sort recursively sorts halves and merges them in linear time.",
        ],
        [
          "Backtracking",
          "Explore choices, prune invalid partial states, and undo mutations before the next branch.",
          "For permutations: choose an unused element, recurse, then unchoose it.",
        ],
        [
          "Greedy algorithms",
          "Choose a local step only when an exchange argument or invariant supports it.",
          "For interval scheduling, repeatedly choose the compatible interval finishing first.",
        ],
        [
          "Bit manipulation",
          "Use bit-level representations for masks, parity, subsets, and compact state.",
          "x & (x − 1) removes the lowest set bit of a positive integer.",
        ],
        [
          "Intervals & sweep line",
          "Turn overlapping ranges into ordered events and track an active set.",
          "Add +1 at an interval start and −1 at its end; define tie handling carefully.",
        ],
      ],
    },
    {
      name: "Trees & graphs",
      url: `${DSA}graph/breadth-first-search.html`,
      topics: [
        [
          "Binary trees & traversals",
          "Process hierarchical data using preorder, inorder, postorder, or level order.",
          "Level-order traversal uses a queue; recursive DFS uses the call stack.",
        ],
        [
          "Binary search trees",
          "Maintain an ordering invariant and understand balancing and duplicate handling.",
          "Every key in the left subtree is less than the node key under a strict BST rule.",
        ],
        [
          "Heaps & priority queues",
          "Efficiently access the next smallest or largest item while inserting new candidates.",
          "Keep a min-heap of size k to retain the k largest values.",
        ],
        [
          "Tries",
          "Represent shared string prefixes and support prefix-based lookup.",
          "Insert each character along a path and mark terminal nodes.",
        ],
        [
          "Graph representation, BFS & DFS",
          "Choose adjacency lists or matrices and track visited state to avoid repeated work.",
          "BFS gives shortest path lengths in an unweighted graph.",
        ],
        [
          "Connected components & disjoint sets",
          "Group connected vertices and maintain component membership under unions.",
          "Union by size plus path compression gives near-constant amortized operations.",
        ],
        [
          "Topological sort & cycle detection",
          "Order dependencies in a DAG and detect when no valid ordering exists.",
          "Kahn’s algorithm starts with zero-indegree vertices.",
        ],
        [
          "Shortest paths",
          "Choose BFS, Dijkstra, Bellman–Ford, or Floyd–Warshall based on weights and constraints.",
          "Dijkstra requires nonnegative edge weights.",
        ],
        [
          "Minimum spanning trees",
          "Connect all vertices with minimum total edge weight when the graph permits it.",
          "Kruskal sorts edges by weight and joins different components using DSU.",
        ],
        [
          "Strongly connected components",
          "Condense directed cycles into components to reveal a DAG.",
          "Kosaraju uses finishing order and a traversal of the reversed graph.",
        ],
      ],
    },
    {
      name: "Dynamic programming & advanced topics",
      url: `${DSA}dynamic_programming/intro-to-dp.html`,
      topics: [
        [
          "DP states, memoization & tabulation",
          "Define what a state means before writing transitions, base cases, and evaluation order.",
          "ways[i] = ways[i − 1] + ways[i − 2], with explicit starting values.",
        ],
        [
          "Knapsack & subset DP",
          "Decide which choices can be reused and choose an iteration order that respects it.",
          "For 0/1 knapsack with one array, iterate capacities downward.",
        ],
        [
          "Sequence & string DP",
          "Solve subsequence, alignment, and edit problems by considering prefixes.",
          "LCS compares the last characters of two prefixes.",
        ],
        [
          "Grid, tree & interval DP",
          "Choose state boundaries appropriate to the structure of the input.",
          "For interval DP, solve shorter intervals before longer ones.",
        ],
        [
          "Fenwick & segment trees",
          "Maintain range summaries while supporting updates without rescanning the full array.",
          "A Fenwick tree supports point additions and prefix sums in O(log n).",
        ],
        [
          "Number theory & combinatorics",
          "Use divisibility, gcd, sieves, modular arithmetic, and counting identities.",
          "Euclid: gcd(a, b) = gcd(b, a mod b), with gcd(a, 0) = |a|.",
        ],
        [
          "String matching algorithms",
          "Avoid repeated comparisons with prefix functions, Z values, or carefully verified hashes.",
          "KMP reuses prefix-match information after a mismatch.",
        ],
        [
          "Network flow & bipartite matching",
          "Model capacity-constrained movement or pairing with residual graphs.",
          "An augmenting path increases flow and updates forward and reverse residual capacities.",
        ],
      ],
    },
  ],
  cp: [
    {
      name: "Contest foundations",
      url: "https://usaco.guide/general/",
      topics: [
        [
          "Fast I/O & contest templates",
          "Keep a small, understood template and select I/O appropriate to the time limit.",
          "Test your template against empty, single-element, and maximum-sized inputs.",
        ],
        [
          "Constraint analysis & complexity",
          "Translate input limits and memory limits into feasible algorithm families.",
          "n near 200,000 usually rules out an O(n²) full pair scan.",
        ],
        [
          "Implementation & simulation",
          "Convert the statement into precise state changes and handle boundary cases.",
          "Write down the state before and after one operation before coding the loop.",
        ],
        [
          "Constructive algorithms",
          "Build any object satisfying constraints and prove the construction is valid.",
          "Try small cases to discover invariants, then justify the general construction.",
        ],
        [
          "Greedy proofs & exchange arguments",
          "Explain why a local decision can be part of an optimal global solution.",
          "Show how any optimum can be changed to use your first choice without worsening it.",
        ],
        [
          "Binary search & two pointers",
          "Exploit monotonicity and maintain clear bounds or moving-window invariants.",
          "Binary search the first true value of a monotonic feasibility predicate.",
        ],
        [
          "Stress testing & debugging",
          "Compare a fast solution with a trusted brute force on many small generated cases.",
          "When outputs differ, keep the smallest failing case and trace it.",
        ],
      ],
    },
    {
      name: "Mathematics & algorithms",
      url: DSA,
      topics: [
        [
          "Modular arithmetic & exponentiation",
          "Reduce intermediate results safely and know when a modular inverse exists.",
          "Binary exponentiation computes a^b mod m in O(log b).",
        ],
        [
          "Primes, sieves & factorization",
          "Choose preprocessing or trial division according to query count and bounds.",
          "A smallest-prime-factor sieve supports repeated factorization queries.",
        ],
        [
          "Combinatorics & inclusion-exclusion",
          "Count outcomes without enumerating them and correct overcounted intersections.",
          "|A ∪ B| = |A| + |B| − |A ∩ B|.",
        ],
        [
          "Dynamic programming",
          "State the subproblem, transition, and dependency order before optimizing.",
          "Use a bitmask state when the number of distinct elements is small.",
        ],
        [
          "DP optimization & state reduction",
          "Reduce memory or transition cost only after proving the dependencies and required optimization conditions.",
          "If row i depends only on row i − 1, store two rows instead of the full table.",
        ],
        [
          "Graph traversal & shortest paths",
          "Model states as vertices and transitions as edges, then choose the right traversal.",
          "0–1 BFS uses a deque for edges weighted only 0 or 1.",
        ],
        [
          "Disjoint sets & spanning trees",
          "Track connectivity under unions and construct low-cost spanning structures.",
          "Kruskal skips an edge when its endpoints already share a representative.",
        ],
        [
          "Trees, LCA & binary lifting",
          "Preprocess ancestor jumps to answer queries efficiently on rooted trees.",
          "up[v][j] stores the 2^j-th ancestor of v.",
        ],
        [
          "Fenwick trees & segment trees",
          "Support range queries and updates with associative summaries and clear identities.",
          "Lazy propagation stores deferred operations on whole segments.",
        ],
        [
          "Offline queries & square-root decomposition",
          "Reorder independent queries or divide the input into blocks to balance update and query costs.",
          "Mo’s algorithm reorders range queries while maintaining a movable window.",
        ],
        [
          "String algorithms & hashing",
          "Use prefix functions, Z algorithms, tries, and hashes while accounting for collisions.",
          "Verify matches when using hashing in correctness-critical comparisons.",
        ],
        [
          "Geometry & numerical precision",
          "Represent orientation, distances, and intersections with careful arithmetic.",
          "The sign of cross(B − A, C − A) gives the turn direction.",
        ],
        [
          "Game theory & Sprague–Grundy",
          "Analyze winning states and combine independent impartial games when assumptions hold.",
          "A normal-play Nim position is losing exactly when the xor of pile sizes is zero.",
        ],
        [
          "Flows & advanced graph techniques",
          "Use residual networks and transformations for matching and capacity problems.",
          "Model a bipartite match as source → left → right → sink, all capacities 1.",
        ],
      ],
    },
    {
      name: "Deliberate competition",
      url: "https://usaco.guide/general/contests",
      topics: [
        [
          "Problem selection & time management",
          "Read broadly, choose tractable work, and reserve time to verify submissions.",
          "Set a checkpoint to switch problems when an approach is no longer progressing.",
        ],
        [
          "Penalty & submission discipline",
          "Understand each contest’s scoring rules and check edge cases before submitting.",
          "Track the scoring rules manually; different platforms count penalties differently.",
        ],
        [
          "Upsolving & editorial study",
          "Return to missed problems, attempt again, and explain the key idea in your own words.",
          "After reading a hint, close the editorial and reconstruct the solution.",
        ],
        [
          "Virtual contests & reflection",
          "Practice under a fixed time budget and record what affected the result.",
          "Record the bottleneck: idea, proof, implementation, debugging, or pacing.",
        ],
      ],
    },
  ],
  web: [
    {
      name: "The browser foundations",
      url: MDN,
      topics: [
        [
          "How the web works",
          "Understand URLs, HTTP, client/server boundaries, browser rendering, and DNS.",
          "A browser requests a document, parses HTML, and discovers dependent resources.",
        ],
        [
          "Semantic HTML",
          "Choose elements by meaning so content remains usable across devices and assistive technology.",
          "<main><article><h1>A useful idea</h1><p>Start with content.</p></article></main>",
        ],
        [
          "Forms & validation",
          "Associate labels, choose appropriate input types, and validate on both client and server.",
          '<label for="email">Email</label><input id="email" type="email" required>',
        ],
        [
          "Accessibility & keyboard interaction",
          "Build with semantics, visible focus, contrast, accessible names, and keyboard access.",
          '<button type="button" aria-expanded="false">Show details</button>',
        ],
        [
          "CSS cascade, selectors & box model",
          "Understand where a style comes from and how content, padding, borders, and margins compose.",
          "* { box-sizing: border-box; }",
        ],
        [
          "Flexbox & Grid",
          "Use one-dimensional or two-dimensional layout systems according to the content.",
          ".cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; }",
        ],
        [
          "Responsive layouts",
          "Design content-driven layouts with fluid sizing, sensible breakpoints, and touch targets.",
          ".page { width: min(100% - 2rem, 70rem); margin-inline: auto; }",
        ],
        [
          "Typography, color & design tokens",
          "Create a consistent visual system with a readable hierarchy and reusable decisions.",
          ":root { --space: 1rem; --radius: .75rem; --ink: #1c2430; }",
        ],
        [
          "Transitions & reduced motion",
          "Use motion to explain changes and honor reduced-motion preferences.",
          "@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }",
        ],
      ],
    },
    {
      name: "JavaScript & browser APIs",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
      topics: [
        [
          "JavaScript values, scope & functions",
          "Understand primitives, references, lexical scope, closures, and function behavior.",
          "const makeCounter = () => { let n = 0; return () => ++n; };",
        ],
        [
          "Arrays, objects & immutable updates",
          "Transform collections while knowing when shared references would mutate existing state.",
          "const updated = items.map(item => item.id === id ? { ...item, done: true } : item);",
        ],
        [
          "DOM & events",
          "Select and update document nodes and handle events with accessible interactions.",
          'button.addEventListener("click", () => { output.textContent = "Saved"; });',
        ],
        [
          "Async JavaScript & promises",
          "Understand asynchronous sequencing, cancellation, error handling, and the event loop.",
          "try { const result = await task(); } catch (error) { showError(error); }",
        ],
        [
          "Fetch & HTTP APIs",
          "Check status codes, parse responses, and handle loading, empty, and error states.",
          "const response = await fetch(url);\nif (!response.ok) throw new Error(String(response.status));",
        ],
        [
          "Modules & package management",
          "Use explicit module boundaries and reproducible dependencies.",
          "export function sum(a, b) { return a + b; }",
        ],
        [
          "Local storage & IndexedDB",
          "Choose storage according to data size, structure, transactions, and recovery needs.",
          "Persist deliberate user data and handle storage failures visibly.",
        ],
        [
          "TypeScript foundations",
          "Use types to describe valid data and narrow uncertain values at boundaries.",
          'type Status = "idle" | "loading" | "ready" | "error";',
        ],
      ],
    },
    {
      name: "Components & application architecture",
      url: "https://react.dev/learn",
      topics: [
        [
          "React components & JSX",
          "Compose interfaces from small components with clear input contracts.",
          "function Greeting({ name }) { return <h1>Hello, {name}</h1>; }",
        ],
        [
          "Props, state & events",
          "Keep source-of-truth state minimal and derive values instead of synchronizing copies.",
          "const [count, setCount] = useState(0);",
        ],
        [
          "Effects & custom hooks",
          "Use effects to synchronize with external systems and always clean up subscriptions.",
          "useEffect(() => { const stop = subscribe(); return stop; }, []);",
        ],
        [
          "Routing & URL state",
          "Give navigable views stable URLs and handle missing or invalid route parameters.",
          "A filtered list can share its selected filter through search parameters.",
        ],
        [
          "Forms & server state",
          "Separate editable input from cached remote data and show request lifecycle states.",
          "Disable duplicate submissions while a save is pending, then show its result.",
        ],
        [
          "State management & boundaries",
          "Place state near its consumers and define explicit module and ownership boundaries.",
          "Lift shared state only as far as the closest common owner.",
        ],
        [
          "Reusable UI & design systems",
          "Build consistent components with accessible behavior and documented variants.",
          "A dialog owns focus trapping, Escape handling, and focus restoration.",
        ],
      ],
    },
    {
      name: "Ship & maintain",
      url: MDN,
      topics: [
        [
          "Git & collaboration",
          "Create focused commits, use branches, review changes, and resolve conflicts carefully.",
          "Inspect the diff before committing and preserve unrelated work.",
        ],
        [
          "Build tools & environment configuration",
          "Understand development servers, production bundles, and what environment values are public.",
          "A value embedded into a browser bundle is visible to the user.",
        ],
        [
          "Testing & debugging",
          "Test meaningful behavior at unit, integration, and end-to-end boundaries.",
          "Verify a saved item survives a reload, rather than only asserting a button exists.",
        ],
        [
          "Node.js & backend fundamentals",
          "Validate input, manage asynchronous work, and separate trusted server logic from the client.",
          "Treat every HTTP request body as untrusted input.",
        ],
        [
          "Databases & API design",
          "Model relationships, use parameterized queries, and define stable response contracts.",
          "Use a transaction when several writes must succeed or fail together.",
        ],
        [
          "Authentication & authorization",
          "Distinguish identity from permission and enforce access on the server.",
          "A hidden UI button is not an authorization check.",
        ],
        [
          "Web security",
          "Understand injection, XSS, CSRF, origin boundaries, and safe handling of user content.",
          "Render untrusted text as text; use an isolated sandbox for runnable examples.",
        ],
        [
          "Performance & Core Web Vitals",
          "Measure real bottlenecks, minimize unnecessary work, and optimize meaningful user journeys.",
          "Reserve image dimensions to prevent layout shifts.",
        ],
        [
          "SEO & metadata",
          "Provide descriptive document structure, metadata, crawlable links, and useful content.",
          "<title>Clear page purpose · Site name</title>",
        ],
        [
          "Deployment & observability",
          "Ship repeatable builds, check production behavior, and make failures diagnosable.",
          "Verify the deployed URL, routing behavior, and an actual data-saving flow.",
        ],
      ],
    },
  ],
};

export function curriculumFor(domain: LearningDomain): Partial<Item>[] {
  return CURRICULUM[domain]
    .flatMap((group) =>
      group.topics.map(([title, explanation, examples]) => ({
        title,
        kind: "topic" as const,
        domain,
        category: group.name,
        explanation,
        examples,
        url: group.url,
        status: "not started",
      })),
    )
    .map((topic, order) => ({ ...topic, order }));
}

export function tabForRecord(domain: LearningDomain, item: Item): string {
  if (item.kind === "topic") return "roadmap";
  if (item.kind === "snippet")
    return domain === "web" && item.category === "playground"
      ? "playground"
      : "snippets";
  if (item.kind === "project") return "projects";
  if (item.kind === "contest") return "contests";
  if (item.kind === "goal") return "goals";
  if (item.kind === "problem") return "problems";
  return "practice";
}
