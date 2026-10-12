import type { Item } from "../lib/types";

export type PersonalCourse = "java-dsa" | "sigma-8";
export type PlatformGate = "leetcode" | "codeforces";
export type ReadinessSkill =
  "arrays" | "strings" | "searching" | "sorting" | "complexity" | "recursion";

export const ROADMAP_START_DATE = "2026-10-11";
export const ROADMAP_END_DATE = "2027-03-31";
export const ROADMAP_SCAFFOLD_VERSION = "2026-10-11-to-2027-03-31-v2";
export const COURSE_MAP_LABEL = "Course map scaffold · editable";
export const ROADMAP_PRIORITY_ORDER = [
  "gsoc-open-source",
  "java-dsa",
  "sigma-8",
  "icpc-after-readiness",
  "maths-college-maintenance",
  "projects-interview-later",
] as const;
export const ROADMAP_STATUSES = [
  "not started",
  "learning",
  "practicing",
  "revising",
  "completed",
  "mastered",
];
export const PERSONAL_COURSES: Record<
  PersonalCourse,
  { title: string; description: string; short: string }
> = {
  "java-dsa": {
    title: "Java + DSA",
    short: "Java + DSA",
    description:
      "Build the fundamentals first. Move forward when you can explain the idea, solve independently, and keep evidence of your work.",
  },
  "sigma-8": {
    title: "Sigma 8.0 Web Development",
    short: "Sigma 8.0",
    description:
      "A planning scaffold using the supplied part and phase labels. Match it to your enrolled course as you go; practice prompts are personal suggestions, not official lesson titles or a claim of completeness.",
  },
};

export type RoadmapTemplate = {
  key: string;
  title: string;
  course: PersonalCourse;
  stage: string;
  courseOrder: number;
  domain: "java" | "dsa" | "web";
  description: string;
  prerequisites: string[];
  beginnerPractice: string;
  independentExercise: string;
  commonMistakes: string;
  revisionNotes: string;
  completionCriteria: string[];
  readinessGate?: ReadinessSkill;
};

type JavaModule = {
  key: string;
  title: string;
  description: string;
  beginnerPractice: string;
  independentExercise: string;
  commonMistakes: string;
  revisionNotes: string;
  completionCriteria: string[];
  readinessGate?: ReadinessSkill;
};

// This is an explicit personal progression, not an imported course or activity log.
const JAVA_STAGES: {
  stage: string;
  domain: "java" | "dsa";
  modules: JavaModule[];
}[] = [
  {
    stage: "Fundamentals",
    domain: "java",
    modules: [
      {
        key: "java.variables",
        title: "Variables & types",
        description:
          "Give values a type and reason about what each expression stores.",
        beginnerPractice:
          "Declare int, long, double, boolean and char values; predict their printed values before running the program.",
        independentExercise:
          "Write a unit-conversion program from a blank file, choosing types and checking a decimal result yourself.",
        commonMistakes:
          "Integer division before assignment to double; using an uninitialized local; arithmetic overflowing before conversion to long.",
        revisionNotes:
          "Revisit primitive ranges, widening versus narrowing, and the difference between a value and a reference.",
        completionCriteria: [
          "Explain the type of each expression in a small program.",
          "Build and run the conversion exercise without copying a solution.",
          "Test a fractional result and record what you learned.",
        ],
      },
      {
        key: "java.io",
        title: "I/O",
        description:
          "Read the requested data and print exactly the intended result.",
        beginnerPractice:
          "Read a name and two numbers, then print a labelled summary using Scanner.",
        independentExercise:
          "Read a small bill from standard input and calculate its total; test names containing spaces.",
        commonMistakes:
          "Mixing nextInt with nextLine without consuming the newline; assuming tokens are whole lines; leaving debug output in the result.",
        revisionNotes:
          "Trace the input cursor. Keep one example with token input and one with line input.",
        completionCriteria: [
          "Read both numeric tokens and a full line correctly.",
          "Write and run the bill exercise independently.",
          "Save example input and the corresponding expected output.",
        ],
      },
      {
        key: "java.operators",
        title: "Operators",
        description:
          "Use arithmetic, comparisons and boolean expressions deliberately.",
        beginnerPractice:
          "Predict results for division, remainder, comparison and short-circuit expressions, then verify them.",
        independentExercise:
          "Implement a price calculation with a discount condition and explain every operator used.",
        commonMistakes:
          "Confusing assignment with equality; relying on unclear precedence; expecting integer division to retain a fraction.",
        revisionNotes:
          "Keep a precedence example and explain why short-circuit evaluation can prevent an invalid operation.",
        completionCriteria: [
          "Explain arithmetic and boolean results before executing them.",
          "Implement and test the discount rule from scratch.",
          "Record a boundary case and a corrected operator mistake.",
        ],
      },
      {
        key: "java.conditionals",
        title: "Conditionals",
        description:
          "Turn a set of rules into complete and non-overlapping branches.",
        beginnerPractice:
          "Classify a number as positive, negative or zero; trace each branch.",
        independentExercise:
          "Build a grade classifier from your own written ranges and test every range boundary.",
        commonMistakes:
          "Missing the equality case; overlapping ranges; attaching else to the wrong if.",
        revisionNotes:
          "Write a small decision table before revisiting nested conditions or switch.",
        completionCriteria: [
          "Explain which branch handles every boundary.",
          "Implement the classifier independently.",
          "Save passing cases for below, at and above a boundary.",
        ],
      },
      {
        key: "java.loops",
        title: "Loops",
        description:
          "Repeat a bounded piece of work with a clear termination condition.",
        beginnerPractice:
          "Print a range, sum its values, and trace a loop counter by hand.",
        independentExercise:
          "Write a digit-sum program from scratch and test zero and a multi-digit input.",
        commonMistakes:
          "Off-by-one bounds; updating the wrong variable; failing to make progress in a while loop.",
        revisionNotes:
          "For each loop, state initialization, condition, update and the meaning of the accumulator.",
        completionCriteria: [
          "Trace for and while loops accurately.",
          "Solve the digit exercise without a worked solution.",
          "Record termination and boundary checks.",
        ],
      },
      {
        key: "java.patterns",
        title: "Patterns",
        description:
          "Use row and column relationships to reason about nested loops.",
        beginnerPractice:
          "Draw a rectangle and a right triangle on paper, then produce the same output with loops.",
        independentExercise:
          "Print a centered pyramid for a size you read from input; derive its spaces and symbols yourself.",
        commonMistakes:
          "Hard-coded rows; mixing row and column counters; printing a newline inside the wrong loop.",
        revisionNotes:
          "Keep the formula for spaces and symbols per row alongside a hand trace for a small input.",
        completionCriteria: [
          "Explain the row/column rule before coding.",
          "Produce the independent pattern at two different sizes.",
          "Record a small dry run that matches the output.",
        ],
      },
      {
        key: "java.functions",
        title: "Functions / methods",
        description:
          "Break a solution into named methods with explicit inputs and results.",
        beginnerPractice:
          "Write methods for maximum of two values and for an even-number check.",
        independentExercise:
          "Create a prime-checking method and a caller that reports primes in an input range.",
        commonMistakes:
          "Printing when the caller needs a return value; confusing scope; returning before all necessary work is done.",
        revisionNotes:
          "Revisit method signatures, local scope, pass-by-value and the contract of each helper.",
        completionCriteria: [
          "Explain parameters, return values and local scope.",
          "Compose the range exercise from your own helper methods.",
          "Test 0, 1, a prime and a composite input.",
        ],
      },
    ],
  },
  {
    stage: "Arrays & 2D arrays",
    domain: "dsa",
    modules: [
      {
        key: "java.arrays",
        title: "Arrays",
        readinessGate: "arrays",
        description:
          "Traverse indexed data and maintain simple invariants while updating it.",
        beginnerPractice:
          "Find an array maximum, count matches and reverse a small array by hand and in Java.",
        independentExercise:
          "Implement an in-place reversal and a second-largest-distinct-value search without looking up a solution.",
        commonMistakes:
          "Index equal to length; confusing index and value; initializing the maximum to zero for negative-only inputs.",
        revisionNotes:
          "Revisit empty and singleton arrays, duplicates, negative values, and the invariant of a two-pointer reversal.",
        completionCriteria: [
          "Explain array bounds and trace updates.",
          "Complete the independent array exercise from a blank file.",
          "Save tests for singleton, duplicate and negative inputs.",
        ],
      },
      {
        key: "java.arrays-2d",
        title: "2D arrays",
        description:
          "Separate row and column bounds when working with matrices.",
        beginnerPractice:
          "Traverse a rectangular matrix and compute the sum of each row.",
        independentExercise:
          "Transpose a rectangular matrix into a new matrix and verify its dimensions yourself.",
        commonMistakes:
          "Assuming every matrix is square; swapping row and column limits; assuming every Java row has the same length.",
        revisionNotes:
          "Draw the index mapping (row, column) to (column, row), and revisit rectangular or ragged input assumptions.",
        completionCriteria: [
          "Trace a matrix traversal without mixing dimensions.",
          "Implement a rectangular transpose independently.",
          "Record tests for one row, one column and a non-square matrix.",
        ],
      },
    ],
  },
  {
    stage: "Searching, sorting & complexity",
    domain: "dsa",
    modules: [
      {
        key: "java.searching",
        title: "Searching",
        readinessGate: "searching",
        description:
          "Choose linear or binary search based on the input and its ordering.",
        beginnerPractice:
          "Implement linear search and trace low, mid and high for binary search on a sorted array.",
        independentExercise:
          "Write binary search from scratch and return a clear not-found result.",
        commonMistakes:
          "Binary search on unsorted input; bounds that never shrink; missing first or last elements.",
        revisionNotes:
          "State the search interval convention and prove that each iteration makes it smaller.",
        completionCriteria: [
          "Explain when binary search is valid.",
          "Implement linear and binary search without a copied solution.",
          "Test empty, absent, first, last and singleton cases.",
        ],
      },
      {
        key: "java.sorting",
        title: "Sorting",
        readinessGate: "sorting",
        description:
          "Understand how a basic sort changes the array one step at a time.",
        beginnerPractice:
          "Trace bubble, selection and insertion sorting on a short array.",
        independentExercise:
          "Implement insertion sort from a blank file, then compare its result with Arrays.sort on your test inputs.",
        commonMistakes:
          "Overwriting a value before shifting; incorrect inner-loop bounds; assuming a sort is stable without checking.",
        revisionNotes:
          "Explain the sorted-prefix invariant and revisit sorted, reverse-sorted and duplicate inputs.",
        completionCriteria: [
          "Trace and explain a basic sorting method.",
          "Implement the independent sort yourself.",
          "Save comparisons for sorted, reverse and duplicate-heavy arrays.",
        ],
      },
      {
        key: "java.complexity",
        title: "Basic time & space complexity",
        readinessGate: "complexity",
        description:
          "Describe how an algorithm's work and extra storage grow with input size.",
        beginnerPractice:
          "Count operations in a single loop, nested loops and binary search.",
        independentExercise:
          "Annotate the time and auxiliary space of your own array, search and sort solutions and justify the bounds.",
        commonMistakes:
          "Treating every nested loop as quadratic; ignoring input size changes; confusing total input storage with auxiliary space.",
        revisionNotes:
          "Keep examples of O(1), O(log n), O(n) and O(n²), including the reason for each bound.",
        completionCriteria: [
          "Explain the basic growth rates in your own words.",
          "Analyze your existing search and sort implementations independently.",
          "Record both time and auxiliary-space reasoning.",
        ],
      },
    ],
  },
  {
    stage: "Strings",
    domain: "java",
    modules: [
      {
        key: "java.strings",
        title: "Strings",
        readinessGate: "strings",
        description:
          "Work with text, content equality and deliberate character handling.",
        beginnerPractice:
          "Traverse a string, count a chosen character, and compare strings using equals.",
        independentExercise:
          "Write a palindrome checker with an explicit case/space policy and a text-building example using StringBuilder.",
        commonMistakes:
          "Using == for content equality; invalid substring bounds; assuming a Java char always represents a whole Unicode character.",
        revisionNotes:
          "Revisit immutability, equals, StringBuilder and the character assumptions of each exercise.",
        completionCriteria: [
          "Explain content equality and string immutability.",
          "Complete the independent text exercise without copying.",
          "Record empty, one-character and mixed-case test cases.",
        ],
      },
    ],
  },
  {
    stage: "Bit manipulation",
    domain: "dsa",
    modules: [
      {
        key: "java.bits",
        title: "Bit manipulation",
        description:
          "Connect bitwise operations to binary representations and small masks.",
        beginnerPractice:
          "Write small integers in binary and trace AND, OR, XOR and shifts.",
        independentExercise:
          "Implement get, set and clear bit helpers, then build a set-bit counter for non-negative integers.",
        commonMistakes:
          "Confusing logical and bitwise operators; ignoring operator precedence; treating signed shifts as unsigned.",
        revisionNotes:
          "Keep a truth table and revisit the sign bit and the difference between >> and >>>.",
        completionCriteria: [
          "Explain each bit operation on a small example.",
          "Implement and test the helpers independently.",
          "Record zero, single-bit and multiple-bit tests.",
        ],
      },
    ],
  },
  {
    stage: "Object-oriented programming",
    domain: "java",
    modules: [
      {
        key: "java.oop",
        title: "OOP",
        description:
          "Model a small concept with encapsulated state and useful behavior.",
        beginnerPractice:
          "Create a class, initialize instances with a constructor and call instance methods.",
        independentExercise:
          "Build a small library-book model with a borrowing rule, then explain how an interface could describe that behavior.",
        commonMistakes:
          "Using static for every field; exposing mutable state directly; confusing an object with its reference.",
        revisionNotes:
          "Review constructors, access modifiers, inheritance versus composition, and method overriding.",
        completionCriteria: [
          "Explain classes, objects and encapsulation.",
          "Implement the small model independently.",
          "Test a valid and an invalid state transition and retain the evidence.",
        ],
      },
    ],
  },
  {
    stage: "Recursion & backtracking",
    domain: "dsa",
    modules: [
      {
        key: "java.recursion",
        title: "Recursion",
        readinessGate: "recursion",
        description:
          "Specify a base case and a strictly smaller subproblem for each call.",
        beginnerPractice:
          "Trace factorial and an array sum with a call-stack diagram.",
        independentExercise:
          "Write a recursive array search from scratch and compare it with your iterative solution.",
        commonMistakes:
          "Missing a base case; failing to reduce the problem; forgetting to return the recursive result.",
        revisionNotes:
          "Record what each call promises, what it returns, and the maximum stack depth.",
        completionCriteria: [
          "Trace calls and returns, including the base case.",
          "Implement the independent recursive exercise yourself.",
          "Record termination tests and time/stack-space reasoning.",
        ],
      },
      {
        key: "java.backtracking",
        title: "Backtracking",
        description:
          "Explore choices and undo temporary state before trying another branch.",
        beginnerPractice:
          "Draw a choice tree for subsets of three distinct values.",
        independentExercise:
          "Generate subsets or permutations from a blank file and explain how you restore the current path.",
        commonMistakes:
          "Not undoing a choice; saving the same mutable list repeatedly; unclear duplicate handling.",
        revisionNotes:
          "Revisit choose, explore, unchoose; state the output size before judging performance.",
        completionCriteria: [
          "Explain the search tree and backtracking invariant.",
          "Generate the chosen result set independently.",
          "Save tests for empty and small inputs without accidental duplicates.",
        ],
      },
    ],
  },
  {
    stage: "Linked lists, stacks & queues",
    domain: "dsa",
    modules: [
      {
        key: "java.linked-lists",
        title: "Linked lists",
        description:
          "Maintain links while inserting, deleting or reversing nodes.",
        beginnerPractice:
          "Draw a three-node list and implement traversal and insertion at the head.",
        independentExercise:
          "Reverse a singly linked list and explain the previous/current/next references.",
        commonMistakes:
          "Losing the next node before updating links; ignoring an empty head; creating a cycle accidentally.",
        revisionNotes:
          "Draw references before and after each mutation, including empty and one-node lists.",
        completionCriteria: [
          "Explain node references and pointer updates.",
          "Reverse a list without copying a worked solution.",
          "Record empty, singleton and multi-node tests.",
        ],
      },
      {
        key: "java.stacks",
        title: "Stacks",
        description: "Use last-in-first-out state to track pending work.",
        beginnerPractice: "Trace push, pop and peek using ArrayDeque.",
        independentExercise:
          "Implement a balanced-brackets checker and explain the stack invariant.",
        commonMistakes:
          "Popping an empty stack; comparing the wrong bracket pair; accepting input with unmatched openers remaining.",
        revisionNotes:
          "Record why the most recent unmatched opener is the next one to close.",
        completionCriteria: [
          "Explain LIFO operations and their intended use.",
          "Write the bracket checker independently.",
          "Test empty, mismatched, nested and incomplete bracket sequences.",
        ],
      },
      {
        key: "java.queues",
        title: "Queues",
        description:
          "Use first-in-first-out processing and distinguish queue operations from stack operations.",
        beginnerPractice:
          "Trace offers, peeks and polls in an ArrayDeque queue.",
        independentExercise:
          "Simulate a service queue with new arrivals and departures, handling an empty queue explicitly.",
        commonMistakes:
          "Mixing operations from opposite deque ends; failing to update the queue; assuming a value is present after polling.",
        revisionNotes:
          "Keep a small FIFO trace and compare it with the equivalent stack trace.",
        completionCriteria: [
          "Explain FIFO and choose consistent deque operations.",
          "Implement the service simulation independently.",
          "Record empty-queue and interleaved-arrival tests.",
        ],
      },
    ],
  },
  {
    stage: "Trees & BST",
    domain: "dsa",
    modules: [
      {
        key: "java.trees",
        title: "Trees",
        description:
          "Traverse a hierarchy and return meaningful results from each subtree.",
        beginnerPractice:
          "Draw a small binary tree and trace preorder, inorder and postorder.",
        independentExercise:
          "Implement tree height and level-order traversal from scratch.",
        commonMistakes:
          "Missing null base cases; mixing edge-height and node-height conventions; confusing traversal orders.",
        revisionNotes:
          "Write down the return contract for a subtree and revisit a skewed tree.",
        completionCriteria: [
          "Explain and trace the traversal orders.",
          "Implement the independent tree exercises yourself.",
          "Test empty, singleton, balanced and skewed trees.",
        ],
      },
      {
        key: "java.bst",
        title: "Binary search trees",
        description:
          "Use a tree's ordering invariant while accounting for its height.",
        beginnerPractice:
          "Insert a small set of distinct values and trace search decisions.",
        independentExercise:
          "Implement BST search and insertion, with an explicit duplicate-value policy.",
        commonMistakes:
          "Assuming every BST is balanced; checking only immediate children; ignoring duplicate policy.",
        revisionNotes:
          "Revisit the global ordering constraint and express operation cost in terms of height.",
        completionCriteria: [
          "Explain the BST invariant and height-dependent cost.",
          "Implement the independent operations yourself.",
          "Record absent-value, duplicate and sorted-insertion tests.",
        ],
      },
    ],
  },
  {
    stage: "Heaps, hashing & tries",
    domain: "dsa",
    modules: [
      {
        key: "java.heaps",
        title: "Heaps",
        description:
          "Maintain the next priority item without fully sorting the collection.",
        beginnerPractice:
          "Trace insertion and removal in a min-heap and use Java PriorityQueue.",
        independentExercise:
          "Find the k largest values with a size-k heap and explain the retained-set invariant.",
        commonMistakes:
          "Assuming iteration produces sorted order; reversing a comparator unintentionally; using subtraction comparisons that overflow.",
        revisionNotes:
          "Revisit heap order, peek versus removal, and why the heap size determines the logarithmic factor.",
        completionCriteria: [
          "Explain heap operations and priority ordering.",
          "Implement the size-k exercise independently.",
          "Record k-boundary, duplicate and negative-value tests.",
        ],
      },
      {
        key: "java.hashing",
        title: "Hashing",
        description:
          "Use keyed lookup and frequency counts with explicit equality assumptions.",
        beginnerPractice:
          "Build a frequency map and trace updates for repeated values.",
        independentExercise:
          "Solve a pair-sum lookup exercise from scratch and handle using the same index twice.",
        commonMistakes:
          "Assuming maps are sorted; inserting before checking when that reuses the current element; ignoring equals/hashCode behavior.",
        revisionNotes:
          "Revisit expected lookup cost, collisions and the key definition used by your solution.",
        completionCriteria: [
          "Explain a map or set's role and equality assumptions.",
          "Complete the independent lookup exercise yourself.",
          "Save tests for repeated values, absent pairs and a self-pair trap.",
        ],
      },
      {
        key: "java.tries",
        title: "Tries",
        description:
          "Represent shared prefixes while distinguishing a word from a prefix.",
        beginnerPractice:
          "Draw the trie for a few words with shared beginnings.",
        independentExercise:
          "Implement insert, exact-word search and prefix search for a declared character set.",
        commonMistakes:
          "Forgetting terminal markers; treating a prefix as a complete word; indexing unsupported characters.",
        revisionNotes:
          "State the character-set policy and relate operation cost to word length.",
        completionCriteria: [
          "Explain prefix nodes and terminal markers.",
          "Implement the trie operations independently.",
          "Record shared-prefix, absent-word and full-word tests.",
        ],
      },
    ],
  },
  {
    stage: "Graphs, BFS & DFS",
    domain: "dsa",
    modules: [
      {
        key: "java.graphs",
        title: "Graphs",
        description:
          "Represent vertices and edges with a clear directed or undirected convention.",
        beginnerPractice:
          "Build an adjacency list from a small edge list and draw its graph.",
        independentExercise:
          "Read and represent a graph, including isolated vertices, then print each vertex's neighbors.",
        commonMistakes:
          "Adding only one direction for undirected edges; confusing vertex count with edge count; mixing indexing conventions.",
        revisionNotes:
          "Revisit directed/undirected and weighted/unweighted assumptions before choosing an algorithm.",
        completionCriteria: [
          "Explain the chosen graph representation.",
          "Build the independent representation exercise yourself.",
          "Record isolated-vertex and disconnected-graph tests.",
        ],
      },
      {
        key: "java.bfs",
        title: "Breadth-first search (BFS)",
        description: "Explore an unweighted graph in layers using a queue.",
        beginnerPractice:
          "Trace the queue, visited set and distance array on a small graph.",
        independentExercise:
          "Compute unweighted shortest-path distances from a chosen source without copying an implementation.",
        commonMistakes:
          "Marking visited too late; confusing graph layers with queue length; assuming unreachable vertices have distance zero.",
        revisionNotes:
          "Explain why first discovery gives shortest distance only in the relevant unweighted setting.",
        completionCriteria: [
          "Explain the queue and discovery invariant.",
          "Implement unweighted-distance BFS independently.",
          "Test cycles, disconnected vertices and a source-only graph.",
        ],
      },
      {
        key: "java.dfs",
        title: "Depth-first search (DFS)",
        description:
          "Explore one branch at a time and revisit disconnected components.",
        beginnerPractice:
          "Trace recursive calls and visited vertices on a cyclic graph.",
        independentExercise:
          "Count connected components of an undirected graph from scratch.",
        commonMistakes:
          "Missing visited checks; starting from only one vertex; exceeding stack depth on a long path.",
        revisionNotes:
          "Compare recursive and explicit-stack traversal and revisit O(V + E) with adjacency lists.",
        completionCriteria: [
          "Explain DFS state and termination on cycles.",
          "Count components with your own implementation.",
          "Save connected, disconnected and isolated-vertex tests.",
        ],
      },
    ],
  },
  {
    stage: "Dynamic programming",
    domain: "dsa",
    modules: [
      {
        key: "java.dp",
        title: "Dynamic programming (DP)",
        description:
          "Define a state and recurrence before memoizing or tabulating repeated subproblems.",
        beginnerPractice:
          "Draw overlapping calls for a simple recurrence and replace repeated work with memoization.",
        independentExercise:
          "Solve a small stairs or grid-path counting problem in both memoized and tabulated form, explaining your state first.",
        commonMistakes:
          "Unclear state meaning; incorrect base cases; reading table entries before their dependencies are available.",
        revisionNotes:
          "Keep state, transition, base cases, evaluation order and complexity together in your notes.",
        completionCriteria: [
          "Explain a DP state and justify its recurrence.",
          "Implement both versions of the independent exercise yourself.",
          "Record base-case tests and compare outputs on small inputs.",
        ],
      },
    ],
  },
];

type SigmaStage = {
  stage: string;
  modules: { key: string; title: string }[];
  beginnerPractice: string;
  independentExercise: string;
  commonMistakes: string;
  revisionNotes: string;
};

// Only supplied part/phase labels are used. Prompts below are editable personal
// practice suggestions, deliberately not assignments of official lecture content.
const SIGMA_STAGES: SigmaStage[] = [
  {
    stage: "HTML Part 1–4 / HTML levels",
    modules: [
      { key: "sigma.html-1", title: "HTML Part 1" },
      { key: "sigma.html-2", title: "HTML Part 2" },
      { key: "sigma.html-3", title: "HTML Part 3" },
      { key: "sigma.html-4", title: "HTML Part 4" },
      { key: "sigma.html-levels", title: "HTML levels" },
    ],
    beginnerPractice:
      "Recreate a small example using only the HTML concepts actually covered in this part. Rename the part to match your course's HTML level labels if needed.",
    independentExercise:
      "Build a small page section from a blank document using this part's concepts, then explain your element choices.",
    commonMistakes:
      "Copying markup without explaining it; choosing elements only for appearance; missing document structure or required labels.",
    revisionNotes:
      "Save the actual concepts from this part, one useful example and a question to revisit. Check meaning and keyboard access.",
  },
  {
    stage: "CSS Part 1–6",
    modules: [
      { key: "sigma.css-1", title: "CSS Part 1" },
      { key: "sigma.css-2", title: "CSS Part 2" },
      { key: "sigma.css-3", title: "CSS Part 3" },
      { key: "sigma.css-4", title: "CSS Part 4" },
      { key: "sigma.css-5", title: "CSS Part 5" },
      { key: "sigma.css-6", title: "CSS Part 6" },
    ],
    beginnerPractice:
      "Recreate one styling example from this part and inspect which declarations produce the result.",
    independentExercise:
      "Style a small component using the concepts actually covered; check it at a narrow and a wide viewport without following a solution.",
    commonMistakes:
      "Adding overrides without inspecting the cascade; fixed widths that overflow; hiding content to make a layout fit.",
    revisionNotes:
      "Record the concepts actually taught, a useful style rule, a layout mistake and the reason your fix works.",
  },
  {
    stage: "Mini Project / Bootstrap / Project",
    modules: [
      { key: "sigma.mini-project", title: "Mini Project" },
      { key: "sigma.bootstrap", title: "Bootstrap" },
      { key: "sigma.project", title: "Project" },
    ],
    beginnerPractice:
      "Break the module's actual brief into small visible outcomes, then recreate one component while understanding its markup and styles.",
    independentExercise:
      "Build or adapt a small part independently and test its responsive behavior. Write down which work is yours and which follows the course.",
    commonMistakes:
      "Leaving placeholder controls; treating framework classes as unexplained magic; checking only one screen width.",
    revisionNotes:
      "Save the actual brief, decisions, unresolved issues and one improvement you can recreate without a tutorial.",
  },
  {
    stage: "JavaScript Part 1–13",
    modules: [
      { key: "sigma.javascript-1", title: "JavaScript Part 1" },
      { key: "sigma.javascript-2", title: "JavaScript Part 2" },
      { key: "sigma.javascript-3", title: "JavaScript Part 3" },
      { key: "sigma.javascript-4", title: "JavaScript Part 4" },
      { key: "sigma.javascript-5", title: "JavaScript Part 5" },
      { key: "sigma.javascript-6", title: "JavaScript Part 6" },
      { key: "sigma.javascript-7", title: "JavaScript Part 7" },
      { key: "sigma.javascript-8", title: "JavaScript Part 8" },
      { key: "sigma.javascript-9", title: "JavaScript Part 9" },
      { key: "sigma.javascript-10", title: "JavaScript Part 10" },
      { key: "sigma.javascript-11", title: "JavaScript Part 11" },
      { key: "sigma.javascript-12", title: "JavaScript Part 12" },
      { key: "sigma.javascript-13", title: "JavaScript Part 13" },
    ],
    beginnerPractice:
      "Trace one example from the concepts actually covered in this part; predict the result before running it.",
    independentExercise:
      "Write a small program or interaction from scratch using this part's concepts, and explain its data flow.",
    commonMistakes:
      "Copying code without tracing values; leaving console errors unexplained; testing only the happy path.",
    revisionNotes:
      "Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.",
  },
  {
    stage: "Terminal + Git & GitHub",
    modules: [{ key: "sigma.git", title: "Terminal + Git & GitHub" }],
    beginnerPractice:
      "Navigate a practice folder, inspect files, initialize a repository and inspect a small diff.",
    independentExercise:
      "Track your own small project with a meaningful commit, create a branch and describe a simple collaboration workflow.",
    commonMistakes:
      "Running commands in the wrong folder; committing generated files or credentials; changing history without understanding it.",
    revisionNotes:
      "Keep commands you understand with a description of their effects and a note on resolving a small conflict.",
  },
  {
    stage: "Backend 1–4 · Node / Express / EJS",
    modules: [
      { key: "sigma.backend-1", title: "Backend 1 · Node/Express/EJS" },
      { key: "sigma.backend-2", title: "Backend 2 · Node/Express/EJS" },
      { key: "sigma.backend-3", title: "Backend 3 · Node/Express/EJS" },
      { key: "sigma.backend-4", title: "Backend 4 · Node/Express/EJS" },
    ],
    beginnerPractice:
      "Run a minimal example for the Node, Express or EJS concepts actually covered in this part; trace the request and response.",
    independentExercise:
      "Build a small server-side behavior using this part's concepts, then test a valid request and an invalid or missing input.",
    commonMistakes:
      "Confusing browser and server execution; sending multiple responses; trusting request input; ignoring an asynchronous failure.",
    revisionNotes:
      "Record the actual part topics, how data moves through the server and the reason for one error-handling choice.",
  },
  {
    stage: "SQL + MongoDB",
    modules: [{ key: "sigma.sql-mongodb", title: "SQL + MongoDB" }],
    beginnerPractice:
      "Use a small practice dataset to create, read and update data with the database covered in this module.",
    independentExercise:
      "Model a small dataset yourself and implement the queries needed for one real feature; check missing and repeated values.",
    commonMistakes:
      "Updating more records than intended; assuming optional fields always exist; mixing persistence and in-memory state.",
    revisionNotes:
      "Save the schema or document shape, important query assumptions and a reproducible way to create your practice data.",
  },
  {
    stage: "Project Phases 1–3",
    modules: [
      { key: "sigma.phase-1", title: "Project Phase 1" },
      { key: "sigma.phase-2", title: "Project Phase 2" },
      { key: "sigma.phase-3", title: "Project Phase 3" },
    ],
    beginnerPractice:
      "Write the actual phase's acceptance criteria from your course materials and reproduce one small working flow.",
    independentExercise:
      "Implement or extend one phase feature independently, test its empty and error states, and record the result.",
    commonMistakes:
      "Calling a screen complete before its controls work; skipping persistence checks; making scope too large to finish.",
    revisionNotes:
      "Record the phase's actual deliverables, your design decisions, evidence and the next unresolved issue.",
  },
  {
    stage: "React Part 1–6 + Major Project",
    modules: [
      { key: "sigma.react-1", title: "React Part 1" },
      { key: "sigma.react-2", title: "React Part 2" },
      { key: "sigma.react-3", title: "React Part 3" },
      { key: "sigma.react-4", title: "React Part 4" },
      { key: "sigma.react-5", title: "React Part 5" },
      { key: "sigma.react-6", title: "React Part 6" },
      { key: "sigma.major-project", title: "Major Project" },
    ],
    beginnerPractice:
      "Recreate a small example or project slice using the React concepts actually covered in this module and explain its state flow.",
    independentExercise:
      "Build a component or project feature from scratch, exercise every visible control, and check empty, invalid and saved states.",
    commonMistakes:
      "Mutating state directly; keeping duplicate state that drifts; leaving controls unconnected; claiming persistence without reloading.",
    revisionNotes:
      "Record the actual module scope, component boundaries, state ownership and the evidence from a complete user flow.",
  },
];

const javaModules = JAVA_STAGES.flatMap(({ stage, domain, modules }) =>
  modules.map((module) => ({ ...module, stage, domain })),
);
const sigmaModules = SIGMA_STAGES.flatMap(({ modules, ...guidance }) =>
  modules.map((module) => ({ ...module, ...guidance })),
);

export const CORE_STRUCTURE_KEYS = [
  "java.arrays",
  "java.linked-lists",
  "java.stacks",
  "java.queues",
  "java.trees",
  "java.bst",
  "java.heaps",
  "java.hashing",
  "java.tries",
];

export const DP_PREREQUISITE_KEYS = [
  "java.recursion",
  "java.backtracking",
  ...CORE_STRUCTURE_KEYS,
  "java.graphs",
  "java.bfs",
  "java.dfs",
];

export const PERSONAL_ROADMAP: RoadmapTemplate[] = [
  ...javaModules.map((module, index) => ({
    ...module,
    course: "java-dsa" as const,
    courseOrder: index + 1,
    prerequisites:
      module.key === "java.dp"
        ? [...DP_PREREQUISITE_KEYS]
        : index
          ? [javaModules[index - 1].key]
          : [],
  })),
  ...sigmaModules.map((module, index) => ({
    ...module,
    course: "sigma-8" as const,
    courseOrder: index + 1,
    domain: "web" as const,
    description:
      "Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.",
    prerequisites: index ? [sigmaModules[index - 1].key] : [],
    completionCriteria: [
      "Record the actual concepts or deliverables covered in this module.",
      "Complete a small independent exercise using those concepts.",
      "Explain the result, test relevant edge cases and save evidence.",
    ],
  })),
];

export const READINESS_SKILLS: { id: ReadinessSkill; label: string }[] = [
  { id: "arrays", label: "Arrays" },
  { id: "strings", label: "Strings" },
  { id: "searching", label: "Searching" },
  { id: "sorting", label: "Sorting" },
  { id: "complexity", label: "Basic complexity" },
  { id: "recursion", label: "Recursion" },
];
export const PLATFORM_GATES: {
  id: PlatformGate;
  title: string;
  description: string;
  skills: ReadinessSkill[];
}[] = [
  {
    id: "leetcode",
    title: "LeetCode",
    description: "Start basic practice when the foundations feel repeatable.",
    skills: ["arrays", "strings", "searching", "sorting"],
  },
  {
    id: "codeforces",
    title: "Codeforces / CP",
    description: "Add basic complexity and recursion before contest practice.",
    skills: [
      "arrays",
      "strings",
      "searching",
      "sorting",
      "complexity",
      "recursion",
    ],
  },
];

export function templateValues(template: RoadmapTemplate): Partial<Item> {
  return {
    title: template.title,
    domain: template.domain,
    course: template.course,
    stage: template.stage,
    category: template.stage,
    courseOrder: template.courseOrder,
    order: template.courseOrder,
    collection: template.key,
    moduleKey: template.key,
    sourceType: "course-map-scaffold",
    roadmapPhase: "scaffold",
    official: false,
    status: "not started",
    prerequisites: [...template.prerequisites],
    description: template.description,
    examples: template.beginnerPractice,
    approach: template.independentExercise,
    mistakes: template.commonMistakes,
    reflection: template.revisionNotes,
    completionCriteria: template.completionCriteria.join("\n"),
    checklist: template.completionCriteria
      .map((line) => `- [ ] ${line}`)
      .join("\n"),
    readinessGate: template.readinessGate || "",
    requiresGate: "",
    body: "",
    evidence: "",
    tags: ["personal-roadmap", `roadmap-v2-${ROADMAP_SCAFFOLD_VERSION}`],
  };
}

export function customModuleValues(
  course: PersonalCourse,
  courseOrder: number,
): Partial<Item> {
  return {
    course,
    courseOrder,
    order: courseOrder,
    domain: course === "sigma-8" ? "web" : "dsa",
    stage: "Custom modules",
    category: "Custom modules",
    sourceType: "personal-module",
    roadmapPhase: "custom",
    official: false,
    status: "not started",
    prerequisites: [],
    completionCriteria:
      "Explain the idea in my own words.\nComplete an independent exercise.\nTest the result and record evidence.",
    checklist:
      "- [ ] Explain the idea in my own words.\n- [ ] Complete an independent exercise.\n- [ ] Test the result and record evidence.",
    tags: ["personal-roadmap"],
  };
}
