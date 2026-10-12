# StudyOS Nexus — editable course maps

These are supplied-source planning scaffolds, not an official complete lecture catalogue. Practice prompts are suggestions. Nothing here marks real progress complete. Java runs in VS Code, not in the website. Prerequisites and completion gates govern progress rather than calendar dates.

## Java + DSA

### 1. Variables & types

Stage: Fundamentals
Prerequisites: None

Give values a type and reason about what each expression stores.

- Beginner practice: Declare int, long, double, boolean and char values; predict their printed values before running the program.
- Independent coding: Write a unit-conversion program from a blank file, choosing types and checking a decimal result yourself.
- Common mistakes: Integer division before assignment to double; using an uninitialized local; arithmetic overflowing before conversion to long.
- Revision notes: Revisit primitive ranges, widening versus narrowing, and the difference between a value and a reference.
- Completion gate:
  - Explain the type of each expression in a small program.
  - Build and run the conversion exercise without copying a solution.
  - Test a fractional result and record what you learned.

Stable module key: `java.variables`

### 2. I/O

Stage: Fundamentals
Prerequisites: Variables & types

Read the requested data and print exactly the intended result.

- Beginner practice: Read a name and two numbers, then print a labelled summary using Scanner.
- Independent coding: Read a small bill from standard input and calculate its total; test names containing spaces.
- Common mistakes: Mixing nextInt with nextLine without consuming the newline; assuming tokens are whole lines; leaving debug output in the result.
- Revision notes: Trace the input cursor. Keep one example with token input and one with line input.
- Completion gate:
  - Read both numeric tokens and a full line correctly.
  - Write and run the bill exercise independently.
  - Save example input and the corresponding expected output.

Stable module key: `java.io`

### 3. Operators

Stage: Fundamentals
Prerequisites: I/O

Use arithmetic, comparisons and boolean expressions deliberately.

- Beginner practice: Predict results for division, remainder, comparison and short-circuit expressions, then verify them.
- Independent coding: Implement a price calculation with a discount condition and explain every operator used.
- Common mistakes: Confusing assignment with equality; relying on unclear precedence; expecting integer division to retain a fraction.
- Revision notes: Keep a precedence example and explain why short-circuit evaluation can prevent an invalid operation.
- Completion gate:
  - Explain arithmetic and boolean results before executing them.
  - Implement and test the discount rule from scratch.
  - Record a boundary case and a corrected operator mistake.

Stable module key: `java.operators`

### 4. Conditionals

Stage: Fundamentals
Prerequisites: Operators

Turn a set of rules into complete and non-overlapping branches.

- Beginner practice: Classify a number as positive, negative or zero; trace each branch.
- Independent coding: Build a grade classifier from your own written ranges and test every range boundary.
- Common mistakes: Missing the equality case; overlapping ranges; attaching else to the wrong if.
- Revision notes: Write a small decision table before revisiting nested conditions or switch.
- Completion gate:
  - Explain which branch handles every boundary.
  - Implement the classifier independently.
  - Save passing cases for below, at and above a boundary.

Stable module key: `java.conditionals`

### 5. Loops

Stage: Fundamentals
Prerequisites: Conditionals

Repeat a bounded piece of work with a clear termination condition.

- Beginner practice: Print a range, sum its values, and trace a loop counter by hand.
- Independent coding: Write a digit-sum program from scratch and test zero and a multi-digit input.
- Common mistakes: Off-by-one bounds; updating the wrong variable; failing to make progress in a while loop.
- Revision notes: For each loop, state initialization, condition, update and the meaning of the accumulator.
- Completion gate:
  - Trace for and while loops accurately.
  - Solve the digit exercise without a worked solution.
  - Record termination and boundary checks.

Stable module key: `java.loops`

### 6. Patterns

Stage: Fundamentals
Prerequisites: Loops

Use row and column relationships to reason about nested loops.

- Beginner practice: Draw a rectangle and a right triangle on paper, then produce the same output with loops.
- Independent coding: Print a centered pyramid for a size you read from input; derive its spaces and symbols yourself.
- Common mistakes: Hard-coded rows; mixing row and column counters; printing a newline inside the wrong loop.
- Revision notes: Keep the formula for spaces and symbols per row alongside a hand trace for a small input.
- Completion gate:
  - Explain the row/column rule before coding.
  - Produce the independent pattern at two different sizes.
  - Record a small dry run that matches the output.

Stable module key: `java.patterns`

### 7. Functions / methods

Stage: Fundamentals
Prerequisites: Patterns

Break a solution into named methods with explicit inputs and results.

- Beginner practice: Write methods for maximum of two values and for an even-number check.
- Independent coding: Create a prime-checking method and a caller that reports primes in an input range.
- Common mistakes: Printing when the caller needs a return value; confusing scope; returning before all necessary work is done.
- Revision notes: Revisit method signatures, local scope, pass-by-value and the contract of each helper.
- Completion gate:
  - Explain parameters, return values and local scope.
  - Compose the range exercise from your own helper methods.
  - Test 0, 1, a prime and a composite input.

Stable module key: `java.functions`

### 8. Arrays

Stage: Arrays & 2D arrays
Prerequisites: Functions / methods

Traverse indexed data and maintain simple invariants while updating it.

- Beginner practice: Find an array maximum, count matches and reverse a small array by hand and in Java.
- Independent coding: Implement an in-place reversal and a second-largest-distinct-value search without looking up a solution.
- Common mistakes: Index equal to length; confusing index and value; initializing the maximum to zero for negative-only inputs.
- Revision notes: Revisit empty and singleton arrays, duplicates, negative values, and the invariant of a two-pointer reversal.
- Completion gate:
  - Explain array bounds and trace updates.
  - Complete the independent array exercise from a blank file.
  - Save tests for singleton, duplicate and negative inputs.

Stable module key: `java.arrays`

### 9. 2D arrays

Stage: Arrays & 2D arrays
Prerequisites: Arrays

Separate row and column bounds when working with matrices.

- Beginner practice: Traverse a rectangular matrix and compute the sum of each row.
- Independent coding: Transpose a rectangular matrix into a new matrix and verify its dimensions yourself.
- Common mistakes: Assuming every matrix is square; swapping row and column limits; assuming every Java row has the same length.
- Revision notes: Draw the index mapping (row, column) to (column, row), and revisit rectangular or ragged input assumptions.
- Completion gate:
  - Trace a matrix traversal without mixing dimensions.
  - Implement a rectangular transpose independently.
  - Record tests for one row, one column and a non-square matrix.

Stable module key: `java.arrays-2d`

### 10. Searching

Stage: Searching, sorting & complexity
Prerequisites: 2D arrays

Choose linear or binary search based on the input and its ordering.

- Beginner practice: Implement linear search and trace low, mid and high for binary search on a sorted array.
- Independent coding: Write binary search from scratch and return a clear not-found result.
- Common mistakes: Binary search on unsorted input; bounds that never shrink; missing first or last elements.
- Revision notes: State the search interval convention and prove that each iteration makes it smaller.
- Completion gate:
  - Explain when binary search is valid.
  - Implement linear and binary search without a copied solution.
  - Test empty, absent, first, last and singleton cases.

Stable module key: `java.searching`

### 11. Sorting

Stage: Searching, sorting & complexity
Prerequisites: Searching

Understand how a basic sort changes the array one step at a time.

- Beginner practice: Trace bubble, selection and insertion sorting on a short array.
- Independent coding: Implement insertion sort from a blank file, then compare its result with Arrays.sort on your test inputs.
- Common mistakes: Overwriting a value before shifting; incorrect inner-loop bounds; assuming a sort is stable without checking.
- Revision notes: Explain the sorted-prefix invariant and revisit sorted, reverse-sorted and duplicate inputs.
- Completion gate:
  - Trace and explain a basic sorting method.
  - Implement the independent sort yourself.
  - Save comparisons for sorted, reverse and duplicate-heavy arrays.

Stable module key: `java.sorting`

### 12. Basic time & space complexity

Stage: Searching, sorting & complexity
Prerequisites: Sorting

Describe how an algorithm's work and extra storage grow with input size.

- Beginner practice: Count operations in a single loop, nested loops and binary search.
- Independent coding: Annotate the time and auxiliary space of your own array, search and sort solutions and justify the bounds.
- Common mistakes: Treating every nested loop as quadratic; ignoring input size changes; confusing total input storage with auxiliary space.
- Revision notes: Keep examples of O(1), O(log n), O(n) and O(n²), including the reason for each bound.
- Completion gate:
  - Explain the basic growth rates in your own words.
  - Analyze your existing search and sort implementations independently.
  - Record both time and auxiliary-space reasoning.

Stable module key: `java.complexity`

### 13. Strings

Stage: Strings
Prerequisites: Basic time & space complexity

Work with text, content equality and deliberate character handling.

- Beginner practice: Traverse a string, count a chosen character, and compare strings using equals.
- Independent coding: Write a palindrome checker with an explicit case/space policy and a text-building example using StringBuilder.
- Common mistakes: Using == for content equality; invalid substring bounds; assuming a Java char always represents a whole Unicode character.
- Revision notes: Revisit immutability, equals, StringBuilder and the character assumptions of each exercise.
- Completion gate:
  - Explain content equality and string immutability.
  - Complete the independent text exercise without copying.
  - Record empty, one-character and mixed-case test cases.

Stable module key: `java.strings`

### 14. Bit manipulation

Stage: Bit manipulation
Prerequisites: Strings

Connect bitwise operations to binary representations and small masks.

- Beginner practice: Write small integers in binary and trace AND, OR, XOR and shifts.
- Independent coding: Implement get, set and clear bit helpers, then build a set-bit counter for non-negative integers.
- Common mistakes: Confusing logical and bitwise operators; ignoring operator precedence; treating signed shifts as unsigned.
- Revision notes: Keep a truth table and revisit the sign bit and the difference between >> and >>>.
- Completion gate:
  - Explain each bit operation on a small example.
  - Implement and test the helpers independently.
  - Record zero, single-bit and multiple-bit tests.

Stable module key: `java.bits`

### 15. OOP

Stage: Object-oriented programming
Prerequisites: Bit manipulation

Model a small concept with encapsulated state and useful behavior.

- Beginner practice: Create a class, initialize instances with a constructor and call instance methods.
- Independent coding: Build a small library-book model with a borrowing rule, then explain how an interface could describe that behavior.
- Common mistakes: Using static for every field; exposing mutable state directly; confusing an object with its reference.
- Revision notes: Review constructors, access modifiers, inheritance versus composition, and method overriding.
- Completion gate:
  - Explain classes, objects and encapsulation.
  - Implement the small model independently.
  - Test a valid and an invalid state transition and retain the evidence.

Stable module key: `java.oop`

### 16. Recursion

Stage: Recursion & backtracking
Prerequisites: OOP

Specify a base case and a strictly smaller subproblem for each call.

- Beginner practice: Trace factorial and an array sum with a call-stack diagram.
- Independent coding: Write a recursive array search from scratch and compare it with your iterative solution.
- Common mistakes: Missing a base case; failing to reduce the problem; forgetting to return the recursive result.
- Revision notes: Record what each call promises, what it returns, and the maximum stack depth.
- Completion gate:
  - Trace calls and returns, including the base case.
  - Implement the independent recursive exercise yourself.
  - Record termination tests and time/stack-space reasoning.

Stable module key: `java.recursion`

### 17. Backtracking

Stage: Recursion & backtracking
Prerequisites: Recursion

Explore choices and undo temporary state before trying another branch.

- Beginner practice: Draw a choice tree for subsets of three distinct values.
- Independent coding: Generate subsets or permutations from a blank file and explain how you restore the current path.
- Common mistakes: Not undoing a choice; saving the same mutable list repeatedly; unclear duplicate handling.
- Revision notes: Revisit choose, explore, unchoose; state the output size before judging performance.
- Completion gate:
  - Explain the search tree and backtracking invariant.
  - Generate the chosen result set independently.
  - Save tests for empty and small inputs without accidental duplicates.

Stable module key: `java.backtracking`

### 18. Linked lists

Stage: Linked lists, stacks & queues
Prerequisites: Backtracking

Maintain links while inserting, deleting or reversing nodes.

- Beginner practice: Draw a three-node list and implement traversal and insertion at the head.
- Independent coding: Reverse a singly linked list and explain the previous/current/next references.
- Common mistakes: Losing the next node before updating links; ignoring an empty head; creating a cycle accidentally.
- Revision notes: Draw references before and after each mutation, including empty and one-node lists.
- Completion gate:
  - Explain node references and pointer updates.
  - Reverse a list without copying a worked solution.
  - Record empty, singleton and multi-node tests.

Stable module key: `java.linked-lists`

### 19. Stacks

Stage: Linked lists, stacks & queues
Prerequisites: Linked lists

Use last-in-first-out state to track pending work.

- Beginner practice: Trace push, pop and peek using ArrayDeque.
- Independent coding: Implement a balanced-brackets checker and explain the stack invariant.
- Common mistakes: Popping an empty stack; comparing the wrong bracket pair; accepting input with unmatched openers remaining.
- Revision notes: Record why the most recent unmatched opener is the next one to close.
- Completion gate:
  - Explain LIFO operations and their intended use.
  - Write the bracket checker independently.
  - Test empty, mismatched, nested and incomplete bracket sequences.

Stable module key: `java.stacks`

### 20. Queues

Stage: Linked lists, stacks & queues
Prerequisites: Stacks

Use first-in-first-out processing and distinguish queue operations from stack operations.

- Beginner practice: Trace offers, peeks and polls in an ArrayDeque queue.
- Independent coding: Simulate a service queue with new arrivals and departures, handling an empty queue explicitly.
- Common mistakes: Mixing operations from opposite deque ends; failing to update the queue; assuming a value is present after polling.
- Revision notes: Keep a small FIFO trace and compare it with the equivalent stack trace.
- Completion gate:
  - Explain FIFO and choose consistent deque operations.
  - Implement the service simulation independently.
  - Record empty-queue and interleaved-arrival tests.

Stable module key: `java.queues`

### 21. Trees

Stage: Trees & BST
Prerequisites: Queues

Traverse a hierarchy and return meaningful results from each subtree.

- Beginner practice: Draw a small binary tree and trace preorder, inorder and postorder.
- Independent coding: Implement tree height and level-order traversal from scratch.
- Common mistakes: Missing null base cases; mixing edge-height and node-height conventions; confusing traversal orders.
- Revision notes: Write down the return contract for a subtree and revisit a skewed tree.
- Completion gate:
  - Explain and trace the traversal orders.
  - Implement the independent tree exercises yourself.
  - Test empty, singleton, balanced and skewed trees.

Stable module key: `java.trees`

### 22. Binary search trees

Stage: Trees & BST
Prerequisites: Trees

Use a tree's ordering invariant while accounting for its height.

- Beginner practice: Insert a small set of distinct values and trace search decisions.
- Independent coding: Implement BST search and insertion, with an explicit duplicate-value policy.
- Common mistakes: Assuming every BST is balanced; checking only immediate children; ignoring duplicate policy.
- Revision notes: Revisit the global ordering constraint and express operation cost in terms of height.
- Completion gate:
  - Explain the BST invariant and height-dependent cost.
  - Implement the independent operations yourself.
  - Record absent-value, duplicate and sorted-insertion tests.

Stable module key: `java.bst`

### 23. Heaps

Stage: Heaps, hashing & tries
Prerequisites: Binary search trees

Maintain the next priority item without fully sorting the collection.

- Beginner practice: Trace insertion and removal in a min-heap and use Java PriorityQueue.
- Independent coding: Find the k largest values with a size-k heap and explain the retained-set invariant.
- Common mistakes: Assuming iteration produces sorted order; reversing a comparator unintentionally; using subtraction comparisons that overflow.
- Revision notes: Revisit heap order, peek versus removal, and why the heap size determines the logarithmic factor.
- Completion gate:
  - Explain heap operations and priority ordering.
  - Implement the size-k exercise independently.
  - Record k-boundary, duplicate and negative-value tests.

Stable module key: `java.heaps`

### 24. Hashing

Stage: Heaps, hashing & tries
Prerequisites: Heaps

Use keyed lookup and frequency counts with explicit equality assumptions.

- Beginner practice: Build a frequency map and trace updates for repeated values.
- Independent coding: Solve a pair-sum lookup exercise from scratch and handle using the same index twice.
- Common mistakes: Assuming maps are sorted; inserting before checking when that reuses the current element; ignoring equals/hashCode behavior.
- Revision notes: Revisit expected lookup cost, collisions and the key definition used by your solution.
- Completion gate:
  - Explain a map or set's role and equality assumptions.
  - Complete the independent lookup exercise yourself.
  - Save tests for repeated values, absent pairs and a self-pair trap.

Stable module key: `java.hashing`

### 25. Tries

Stage: Heaps, hashing & tries
Prerequisites: Hashing

Represent shared prefixes while distinguishing a word from a prefix.

- Beginner practice: Draw the trie for a few words with shared beginnings.
- Independent coding: Implement insert, exact-word search and prefix search for a declared character set.
- Common mistakes: Forgetting terminal markers; treating a prefix as a complete word; indexing unsupported characters.
- Revision notes: State the character-set policy and relate operation cost to word length.
- Completion gate:
  - Explain prefix nodes and terminal markers.
  - Implement the trie operations independently.
  - Record shared-prefix, absent-word and full-word tests.

Stable module key: `java.tries`

### 26. Graphs

Stage: Graphs, BFS & DFS
Prerequisites: Tries

Represent vertices and edges with a clear directed or undirected convention.

- Beginner practice: Build an adjacency list from a small edge list and draw its graph.
- Independent coding: Read and represent a graph, including isolated vertices, then print each vertex's neighbors.
- Common mistakes: Adding only one direction for undirected edges; confusing vertex count with edge count; mixing indexing conventions.
- Revision notes: Revisit directed/undirected and weighted/unweighted assumptions before choosing an algorithm.
- Completion gate:
  - Explain the chosen graph representation.
  - Build the independent representation exercise yourself.
  - Record isolated-vertex and disconnected-graph tests.

Stable module key: `java.graphs`

### 27. Breadth-first search (BFS)

Stage: Graphs, BFS & DFS
Prerequisites: Graphs

Explore an unweighted graph in layers using a queue.

- Beginner practice: Trace the queue, visited set and distance array on a small graph.
- Independent coding: Compute unweighted shortest-path distances from a chosen source without copying an implementation.
- Common mistakes: Marking visited too late; confusing graph layers with queue length; assuming unreachable vertices have distance zero.
- Revision notes: Explain why first discovery gives shortest distance only in the relevant unweighted setting.
- Completion gate:
  - Explain the queue and discovery invariant.
  - Implement unweighted-distance BFS independently.
  - Test cycles, disconnected vertices and a source-only graph.

Stable module key: `java.bfs`

### 28. Depth-first search (DFS)

Stage: Graphs, BFS & DFS
Prerequisites: Breadth-first search (BFS)

Explore one branch at a time and revisit disconnected components.

- Beginner practice: Trace recursive calls and visited vertices on a cyclic graph.
- Independent coding: Count connected components of an undirected graph from scratch.
- Common mistakes: Missing visited checks; starting from only one vertex; exceeding stack depth on a long path.
- Revision notes: Compare recursive and explicit-stack traversal and revisit O(V + E) with adjacency lists.
- Completion gate:
  - Explain DFS state and termination on cycles.
  - Count components with your own implementation.
  - Save connected, disconnected and isolated-vertex tests.

Stable module key: `java.dfs`

### 29. Dynamic programming (DP)

Stage: Dynamic programming
Prerequisites: Recursion, Backtracking, Arrays, Linked lists, Stacks, Queues, Trees, Binary search trees, Heaps, Hashing, Tries, Graphs, Breadth-first search (BFS), Depth-first search (DFS)

Define a state and recurrence before memoizing or tabulating repeated subproblems.

- Beginner practice: Draw overlapping calls for a simple recurrence and replace repeated work with memoization.
- Independent coding: Solve a small stairs or grid-path counting problem in both memoized and tabulated form, explaining your state first.
- Common mistakes: Unclear state meaning; incorrect base cases; reading table entries before their dependencies are available.
- Revision notes: Keep state, transition, base cases, evaluation order and complexity together in your notes.
- Completion gate:
  - Explain a DP state and justify its recurrence.
  - Implement both versions of the independent exercise yourself.
  - Record base-case tests and compare outputs on small inputs.

Stable module key: `java.dp`

## Sigma 8.0 Web Development

### 1. HTML Part 1

Stage: HTML Part 1–4 / HTML levels
Prerequisites: None

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example using only the HTML concepts actually covered in this part. Rename the part to match your course's HTML level labels if needed.
- Independent coding: Build a small page section from a blank document using this part's concepts, then explain your element choices.
- Common mistakes: Copying markup without explaining it; choosing elements only for appearance; missing document structure or required labels.
- Revision notes: Save the actual concepts from this part, one useful example and a question to revisit. Check meaning and keyboard access.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.html-1`

### 2. HTML Part 2

Stage: HTML Part 1–4 / HTML levels
Prerequisites: HTML Part 1

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example using only the HTML concepts actually covered in this part. Rename the part to match your course's HTML level labels if needed.
- Independent coding: Build a small page section from a blank document using this part's concepts, then explain your element choices.
- Common mistakes: Copying markup without explaining it; choosing elements only for appearance; missing document structure or required labels.
- Revision notes: Save the actual concepts from this part, one useful example and a question to revisit. Check meaning and keyboard access.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.html-2`

### 3. HTML Part 3

Stage: HTML Part 1–4 / HTML levels
Prerequisites: HTML Part 2

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example using only the HTML concepts actually covered in this part. Rename the part to match your course's HTML level labels if needed.
- Independent coding: Build a small page section from a blank document using this part's concepts, then explain your element choices.
- Common mistakes: Copying markup without explaining it; choosing elements only for appearance; missing document structure or required labels.
- Revision notes: Save the actual concepts from this part, one useful example and a question to revisit. Check meaning and keyboard access.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.html-3`

### 4. HTML Part 4

Stage: HTML Part 1–4 / HTML levels
Prerequisites: HTML Part 3

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example using only the HTML concepts actually covered in this part. Rename the part to match your course's HTML level labels if needed.
- Independent coding: Build a small page section from a blank document using this part's concepts, then explain your element choices.
- Common mistakes: Copying markup without explaining it; choosing elements only for appearance; missing document structure or required labels.
- Revision notes: Save the actual concepts from this part, one useful example and a question to revisit. Check meaning and keyboard access.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.html-4`

### 5. HTML levels

Stage: HTML Part 1–4 / HTML levels
Prerequisites: HTML Part 4

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example using only the HTML concepts actually covered in this part. Rename the part to match your course's HTML level labels if needed.
- Independent coding: Build a small page section from a blank document using this part's concepts, then explain your element choices.
- Common mistakes: Copying markup without explaining it; choosing elements only for appearance; missing document structure or required labels.
- Revision notes: Save the actual concepts from this part, one useful example and a question to revisit. Check meaning and keyboard access.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.html-levels`

### 6. CSS Part 1

Stage: CSS Part 1–6
Prerequisites: HTML levels

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate one styling example from this part and inspect which declarations produce the result.
- Independent coding: Style a small component using the concepts actually covered; check it at a narrow and a wide viewport without following a solution.
- Common mistakes: Adding overrides without inspecting the cascade; fixed widths that overflow; hiding content to make a layout fit.
- Revision notes: Record the concepts actually taught, a useful style rule, a layout mistake and the reason your fix works.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.css-1`

### 7. CSS Part 2

Stage: CSS Part 1–6
Prerequisites: CSS Part 1

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate one styling example from this part and inspect which declarations produce the result.
- Independent coding: Style a small component using the concepts actually covered; check it at a narrow and a wide viewport without following a solution.
- Common mistakes: Adding overrides without inspecting the cascade; fixed widths that overflow; hiding content to make a layout fit.
- Revision notes: Record the concepts actually taught, a useful style rule, a layout mistake and the reason your fix works.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.css-2`

### 8. CSS Part 3

Stage: CSS Part 1–6
Prerequisites: CSS Part 2

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate one styling example from this part and inspect which declarations produce the result.
- Independent coding: Style a small component using the concepts actually covered; check it at a narrow and a wide viewport without following a solution.
- Common mistakes: Adding overrides without inspecting the cascade; fixed widths that overflow; hiding content to make a layout fit.
- Revision notes: Record the concepts actually taught, a useful style rule, a layout mistake and the reason your fix works.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.css-3`

### 9. CSS Part 4

Stage: CSS Part 1–6
Prerequisites: CSS Part 3

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate one styling example from this part and inspect which declarations produce the result.
- Independent coding: Style a small component using the concepts actually covered; check it at a narrow and a wide viewport without following a solution.
- Common mistakes: Adding overrides without inspecting the cascade; fixed widths that overflow; hiding content to make a layout fit.
- Revision notes: Record the concepts actually taught, a useful style rule, a layout mistake and the reason your fix works.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.css-4`

### 10. CSS Part 5

Stage: CSS Part 1–6
Prerequisites: CSS Part 4

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate one styling example from this part and inspect which declarations produce the result.
- Independent coding: Style a small component using the concepts actually covered; check it at a narrow and a wide viewport without following a solution.
- Common mistakes: Adding overrides without inspecting the cascade; fixed widths that overflow; hiding content to make a layout fit.
- Revision notes: Record the concepts actually taught, a useful style rule, a layout mistake and the reason your fix works.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.css-5`

### 11. CSS Part 6

Stage: CSS Part 1–6
Prerequisites: CSS Part 5

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate one styling example from this part and inspect which declarations produce the result.
- Independent coding: Style a small component using the concepts actually covered; check it at a narrow and a wide viewport without following a solution.
- Common mistakes: Adding overrides without inspecting the cascade; fixed widths that overflow; hiding content to make a layout fit.
- Revision notes: Record the concepts actually taught, a useful style rule, a layout mistake and the reason your fix works.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.css-6`

### 12. Mini Project

Stage: Mini Project / Bootstrap / Project
Prerequisites: CSS Part 6

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Break the module's actual brief into small visible outcomes, then recreate one component while understanding its markup and styles.
- Independent coding: Build or adapt a small part independently and test its responsive behavior. Write down which work is yours and which follows the course.
- Common mistakes: Leaving placeholder controls; treating framework classes as unexplained magic; checking only one screen width.
- Revision notes: Save the actual brief, decisions, unresolved issues and one improvement you can recreate without a tutorial.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.mini-project`

### 13. Bootstrap

Stage: Mini Project / Bootstrap / Project
Prerequisites: Mini Project

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Break the module's actual brief into small visible outcomes, then recreate one component while understanding its markup and styles.
- Independent coding: Build or adapt a small part independently and test its responsive behavior. Write down which work is yours and which follows the course.
- Common mistakes: Leaving placeholder controls; treating framework classes as unexplained magic; checking only one screen width.
- Revision notes: Save the actual brief, decisions, unresolved issues and one improvement you can recreate without a tutorial.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.bootstrap`

### 14. Project

Stage: Mini Project / Bootstrap / Project
Prerequisites: Bootstrap

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Break the module's actual brief into small visible outcomes, then recreate one component while understanding its markup and styles.
- Independent coding: Build or adapt a small part independently and test its responsive behavior. Write down which work is yours and which follows the course.
- Common mistakes: Leaving placeholder controls; treating framework classes as unexplained magic; checking only one screen width.
- Revision notes: Save the actual brief, decisions, unresolved issues and one improvement you can recreate without a tutorial.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.project`

### 15. JavaScript Part 1

Stage: JavaScript Part 1–13
Prerequisites: Project

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-1`

### 16. JavaScript Part 2

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 1

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-2`

### 17. JavaScript Part 3

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 2

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-3`

### 18. JavaScript Part 4

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 3

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-4`

### 19. JavaScript Part 5

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 4

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-5`

### 20. JavaScript Part 6

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 5

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-6`

### 21. JavaScript Part 7

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 6

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-7`

### 22. JavaScript Part 8

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 7

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-8`

### 23. JavaScript Part 9

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 8

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-9`

### 24. JavaScript Part 10

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 9

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-10`

### 25. JavaScript Part 11

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 10

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-11`

### 26. JavaScript Part 12

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 11

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-12`

### 27. JavaScript Part 13

Stage: JavaScript Part 1–13
Prerequisites: JavaScript Part 12

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Trace one example from the concepts actually covered in this part; predict the result before running it.
- Independent coding: Write a small program or interaction from scratch using this part's concepts, and explain its data flow.
- Common mistakes: Copying code without tracing values; leaving console errors unexplained; testing only the happy path.
- Revision notes: Record the actual part topics, a small runnable example, an edge case and any scope, type or timing confusion to revisit.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.javascript-13`

### 28. Terminal + Git & GitHub

Stage: Terminal + Git & GitHub
Prerequisites: JavaScript Part 13

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Navigate a practice folder, inspect files, initialize a repository and inspect a small diff.
- Independent coding: Track your own small project with a meaningful commit, create a branch and describe a simple collaboration workflow.
- Common mistakes: Running commands in the wrong folder; committing generated files or credentials; changing history without understanding it.
- Revision notes: Keep commands you understand with a description of their effects and a note on resolving a small conflict.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.git`

### 29. Backend 1 · Node/Express/EJS

Stage: Backend 1–4 · Node / Express / EJS
Prerequisites: Terminal + Git & GitHub

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Run a minimal example for the Node, Express or EJS concepts actually covered in this part; trace the request and response.
- Independent coding: Build a small server-side behavior using this part's concepts, then test a valid request and an invalid or missing input.
- Common mistakes: Confusing browser and server execution; sending multiple responses; trusting request input; ignoring an asynchronous failure.
- Revision notes: Record the actual part topics, how data moves through the server and the reason for one error-handling choice.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.backend-1`

### 30. Backend 2 · Node/Express/EJS

Stage: Backend 1–4 · Node / Express / EJS
Prerequisites: Backend 1 · Node/Express/EJS

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Run a minimal example for the Node, Express or EJS concepts actually covered in this part; trace the request and response.
- Independent coding: Build a small server-side behavior using this part's concepts, then test a valid request and an invalid or missing input.
- Common mistakes: Confusing browser and server execution; sending multiple responses; trusting request input; ignoring an asynchronous failure.
- Revision notes: Record the actual part topics, how data moves through the server and the reason for one error-handling choice.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.backend-2`

### 31. Backend 3 · Node/Express/EJS

Stage: Backend 1–4 · Node / Express / EJS
Prerequisites: Backend 2 · Node/Express/EJS

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Run a minimal example for the Node, Express or EJS concepts actually covered in this part; trace the request and response.
- Independent coding: Build a small server-side behavior using this part's concepts, then test a valid request and an invalid or missing input.
- Common mistakes: Confusing browser and server execution; sending multiple responses; trusting request input; ignoring an asynchronous failure.
- Revision notes: Record the actual part topics, how data moves through the server and the reason for one error-handling choice.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.backend-3`

### 32. Backend 4 · Node/Express/EJS

Stage: Backend 1–4 · Node / Express / EJS
Prerequisites: Backend 3 · Node/Express/EJS

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Run a minimal example for the Node, Express or EJS concepts actually covered in this part; trace the request and response.
- Independent coding: Build a small server-side behavior using this part's concepts, then test a valid request and an invalid or missing input.
- Common mistakes: Confusing browser and server execution; sending multiple responses; trusting request input; ignoring an asynchronous failure.
- Revision notes: Record the actual part topics, how data moves through the server and the reason for one error-handling choice.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.backend-4`

### 33. SQL + MongoDB

Stage: SQL + MongoDB
Prerequisites: Backend 4 · Node/Express/EJS

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Use a small practice dataset to create, read and update data with the database covered in this module.
- Independent coding: Model a small dataset yourself and implement the queries needed for one real feature; check missing and repeated values.
- Common mistakes: Updating more records than intended; assuming optional fields always exist; mixing persistence and in-memory state.
- Revision notes: Save the schema or document shape, important query assumptions and a reproducible way to create your practice data.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.sql-mongodb`

### 34. Project Phase 1

Stage: Project Phases 1–3
Prerequisites: SQL + MongoDB

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Write the actual phase's acceptance criteria from your course materials and reproduce one small working flow.
- Independent coding: Implement or extend one phase feature independently, test its empty and error states, and record the result.
- Common mistakes: Calling a screen complete before its controls work; skipping persistence checks; making scope too large to finish.
- Revision notes: Record the phase's actual deliverables, your design decisions, evidence and the next unresolved issue.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.phase-1`

### 35. Project Phase 2

Stage: Project Phases 1–3
Prerequisites: Project Phase 1

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Write the actual phase's acceptance criteria from your course materials and reproduce one small working flow.
- Independent coding: Implement or extend one phase feature independently, test its empty and error states, and record the result.
- Common mistakes: Calling a screen complete before its controls work; skipping persistence checks; making scope too large to finish.
- Revision notes: Record the phase's actual deliverables, your design decisions, evidence and the next unresolved issue.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.phase-2`

### 36. Project Phase 3

Stage: Project Phases 1–3
Prerequisites: Project Phase 2

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Write the actual phase's acceptance criteria from your course materials and reproduce one small working flow.
- Independent coding: Implement or extend one phase feature independently, test its empty and error states, and record the result.
- Common mistakes: Calling a screen complete before its controls work; skipping persistence checks; making scope too large to finish.
- Revision notes: Record the phase's actual deliverables, your design decisions, evidence and the next unresolved issue.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.phase-3`

### 37. React Part 1

Stage: React Part 1–6 + Major Project
Prerequisites: Project Phase 3

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example or project slice using the React concepts actually covered in this module and explain its state flow.
- Independent coding: Build a component or project feature from scratch, exercise every visible control, and check empty, invalid and saved states.
- Common mistakes: Mutating state directly; keeping duplicate state that drifts; leaving controls unconnected; claiming persistence without reloading.
- Revision notes: Record the actual module scope, component boundaries, state ownership and the evidence from a complete user flow.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.react-1`

### 38. React Part 2

Stage: React Part 1–6 + Major Project
Prerequisites: React Part 1

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example or project slice using the React concepts actually covered in this module and explain its state flow.
- Independent coding: Build a component or project feature from scratch, exercise every visible control, and check empty, invalid and saved states.
- Common mistakes: Mutating state directly; keeping duplicate state that drifts; leaving controls unconnected; claiming persistence without reloading.
- Revision notes: Record the actual module scope, component boundaries, state ownership and the evidence from a complete user flow.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.react-2`

### 39. React Part 3

Stage: React Part 1–6 + Major Project
Prerequisites: React Part 2

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example or project slice using the React concepts actually covered in this module and explain its state flow.
- Independent coding: Build a component or project feature from scratch, exercise every visible control, and check empty, invalid and saved states.
- Common mistakes: Mutating state directly; keeping duplicate state that drifts; leaving controls unconnected; claiming persistence without reloading.
- Revision notes: Record the actual module scope, component boundaries, state ownership and the evidence from a complete user flow.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.react-3`

### 40. React Part 4

Stage: React Part 1–6 + Major Project
Prerequisites: React Part 3

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example or project slice using the React concepts actually covered in this module and explain its state flow.
- Independent coding: Build a component or project feature from scratch, exercise every visible control, and check empty, invalid and saved states.
- Common mistakes: Mutating state directly; keeping duplicate state that drifts; leaving controls unconnected; claiming persistence without reloading.
- Revision notes: Record the actual module scope, component boundaries, state ownership and the evidence from a complete user flow.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.react-4`

### 41. React Part 5

Stage: React Part 1–6 + Major Project
Prerequisites: React Part 4

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example or project slice using the React concepts actually covered in this module and explain its state flow.
- Independent coding: Build a component or project feature from scratch, exercise every visible control, and check empty, invalid and saved states.
- Common mistakes: Mutating state directly; keeping duplicate state that drifts; leaving controls unconnected; claiming persistence without reloading.
- Revision notes: Record the actual module scope, component boundaries, state ownership and the evidence from a complete user flow.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.react-5`

### 42. React Part 6

Stage: React Part 1–6 + Major Project
Prerequisites: React Part 5

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example or project slice using the React concepts actually covered in this module and explain its state flow.
- Independent coding: Build a component or project feature from scratch, exercise every visible control, and check empty, invalid and saved states.
- Common mistakes: Mutating state directly; keeping duplicate state that drifts; leaving controls unconnected; claiming persistence without reloading.
- Revision notes: Record the actual module scope, component boundaries, state ownership and the evidence from a complete user flow.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.react-6`

### 43. Major Project

Stage: React Part 1–6 + Major Project
Prerequisites: React Part 6

Use this supplied course-map label to organize your own study. Add the actual concepts, resources and scope from your course as you learn.

- Beginner practice: Recreate a small example or project slice using the React concepts actually covered in this module and explain its state flow.
- Independent coding: Build a component or project feature from scratch, exercise every visible control, and check empty, invalid and saved states.
- Common mistakes: Mutating state directly; keeping duplicate state that drifts; leaving controls unconnected; claiming persistence without reloading.
- Revision notes: Record the actual module scope, component boundaries, state ownership and the evidence from a complete user flow.
- Completion gate:
  - Record the actual concepts or deliverables covered in this module.
  - Complete a small independent exercise using those concepts.
  - Explain the result, test relevant edge cases and save evidence.

Stable module key: `sigma.major-project`
