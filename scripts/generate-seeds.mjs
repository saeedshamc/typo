import fs from "fs";

const dir = "d:/Saeed/GitHub/typo/src-tauri/seed";
const w = (n, items) => {
  fs.writeFileSync(`${dir}/${n}`, `${JSON.stringify(items, null, 2)}\n`);
  console.log(n, items.length);
};
const item = (lang, diff, body) => ({
  category: "code",
  language: lang,
  difficulty: diff,
  body,
});

w("code_javascript.json", [
  item("javascript", "beginner", "function add(a, b) {\n  return a + b;\n}\n\nconsole.log(add(2, 3));"),
  item("javascript", "beginner", "const numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(n => n * 2);\nconsole.log(doubled);"),
  item("javascript", "beginner", "const user = { name: 'Ada', active: true };\nif (user.active) {\n  console.log(`hello ${user.name}`);\n}"),
  item("javascript", "beginner", "for (let i = 0; i < 5; i++) {\n  console.log(i);\n}"),
  item("javascript", "intermediate", "async function fetchUser(id) {\n  const res = await fetch(`/api/users/${id}`);\n  if (!res.ok) throw new Error('failed to fetch user');\n  return res.json();\n}"),
  item("javascript", "intermediate", "class EventEmitter {\n  constructor() { this.listeners = {}; }\n  on(event, cb) {\n    (this.listeners[event] ??= []).push(cb);\n  }\n  emit(event, ...args) {\n    (this.listeners[event] || []).forEach(cb => cb(...args));\n  }\n}"),
  item("javascript", "intermediate", "export function groupBy(items, keyFn) {\n  return items.reduce((acc, item) => {\n    const key = keyFn(item);\n    (acc[key] ??= []).push(item);\n    return acc;\n  }, {});\n}"),
  item("javascript", "intermediate", "function debounce(fn, delay) {\n  let timer = null;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}"),
  item("javascript", "advanced", "const memoize = (fn) => {\n  const cache = new Map();\n  return (...args) => {\n    const key = JSON.stringify(args);\n    if (!cache.has(key)) cache.set(key, fn(...args));\n    return cache.get(key);\n  };\n};"),
  item("javascript", "advanced", "export async function* paginate(fetchPage) {\n  let page = 1;\n  while (true) {\n    const rows = await fetchPage(page);\n    if (!rows.length) return;\n    yield* rows;\n    page += 1;\n  }\n}"),
  item("javascript", "advanced", "function createStore(reducer, initial) {\n  let state = initial;\n  const listeners = new Set();\n  return {\n    getState: () => state,\n    dispatch: (action) => {\n      state = reducer(state, action);\n      listeners.forEach((l) => l());\n    },\n    subscribe: (listener) => {\n      listeners.add(listener);\n      return () => listeners.delete(listener);\n    },\n  };\n}"),
]);

w("code_typescript.json", [
  item("typescript", "beginner", "function add(a: number, b: number): number {\n  return a + b;\n}\n\nconsole.log(add(2, 3));"),
  item("typescript", "beginner", "type User = { id: number; name: string };\nconst user: User = { id: 1, name: 'Ada' };\nconsole.log(user.name);"),
  item("typescript", "beginner", "const values: number[] = [1, 2, 3];\nconst total = values.reduce((sum, n) => sum + n, 0);"),
  item("typescript", "intermediate", "interface Repo<T> {\n  findById(id: string): Promise<T | null>;\n  save(entity: T): Promise<void>;\n}\n\nasync function loadUser(repo: Repo<User>, id: string) {\n  const user = await repo.findById(id);\n  if (!user) throw new Error('missing user');\n  return user;\n}"),
  item("typescript", "intermediate", "type Result<T> =\n  | { ok: true; value: T }\n  | { ok: false; error: string };\n\nfunction ok<T>(value: T): Result<T> {\n  return { ok: true, value };\n}"),
  item("typescript", "intermediate", "export function assertNever(x: never): never {\n  throw new Error(`unexpected value: ${JSON.stringify(x)}`);\n}"),
  item("typescript", "advanced", "type DeepReadonly<T> = {\n  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];\n};\n\nfunction freezeConfig<T extends object>(config: T): DeepReadonly<T> {\n  return Object.freeze(config) as DeepReadonly<T>;\n}"),
  item("typescript", "advanced", "async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {\n  let lastError: unknown;\n  for (let i = 0; i < attempts; i++) {\n    try {\n      return await fn();\n    } catch (err) {\n      lastError = err;\n    }\n  }\n  throw lastError;\n}"),
  item("typescript", "advanced", "export class EventBus<Events extends Record<string, unknown>> {\n  private listeners = new Map<keyof Events, Set<Function>>();\n  on<K extends keyof Events>(event: K, cb: (payload: Events[K]) => void) {\n    const set = this.listeners.get(event) ?? new Set();\n    set.add(cb);\n    this.listeners.set(event, set);\n  }\n}"),
]);

w("code_python.json", [
  item("python", "beginner", "def add(a, b):\n    return a + b\n\nprint(add(2, 3))"),
  item("python", "beginner", "numbers = [1, 2, 3, 4, 5]\ndoubled = [n * 2 for n in numbers]\nprint(doubled)"),
  item("python", "beginner", "name = 'Ada'\nif name:\n    print(f'hello {name}')"),
  item("python", "beginner", "for i in range(5):\n    print(i)"),
  item("python", "intermediate", "class Stack:\n    def __init__(self):\n        self._items = []\n\n    def push(self, item):\n        self._items.append(item)\n\n    def pop(self):\n        return self._items.pop() if self._items else None"),
  item("python", "intermediate", "import json\n\ndef load_config(path):\n    with open(path, 'r', encoding='utf-8') as f:\n        return json.load(f)"),
  item("python", "intermediate", "from collections import defaultdict\n\ndef group_by(items, key_fn):\n    grouped = defaultdict(list)\n    for item in items:\n        grouped[key_fn(item)].append(item)\n    return dict(grouped)"),
  item("python", "intermediate", "def retry(fn, attempts=3):\n    last = None\n    for _ in range(attempts):\n        try:\n            return fn()\n        except Exception as exc:\n            last = exc\n    raise last"),
  item("python", "advanced", "from functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)"),
  item("python", "advanced", "async def gather_results(coros):\n    try:\n        return await asyncio.gather(*coros, return_exceptions=True)\n    except Exception as exc:\n        logger.error('gather failed: %s', exc)\n        raise"),
  item("python", "advanced", "class CachedProperty:\n    def __init__(self, func):\n        self.func = func\n        self.name = func.__name__\n\n    def __get__(self, obj, owner=None):\n        if obj is None:\n            return self\n        value = self.func(obj)\n        setattr(obj, self.name, value)\n        return value"),
]);

w("code_go.json", [
  item("go", "beginner", "package main\n\nimport \"fmt\"\n\nfunc add(a, b int) int {\n\treturn a + b\n}\n\nfunc main() {\n\tfmt.Println(add(2, 3))\n}"),
  item("go", "beginner", "package main\n\nfunc main() {\n\tnums := []int{1, 2, 3, 4}\n\tfor _, n := range nums {\n\t\tprintln(n * 2)\n\t}\n}"),
  item("go", "beginner", "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tname := \"Ada\"\n\tfmt.Printf(\"hello %s\\n\", name)\n}"),
  item("go", "intermediate", "package main\n\nfunc findUser(id int64) (string, bool) {\n\tif id <= 0 {\n\t\treturn \"\", false\n\t}\n\treturn fmt.Sprintf(\"user-%d\", id), true\n}"),
  item("go", "intermediate", "type Stack[T any] struct {\n\titems []T\n}\n\nfunc (s *Stack[T]) Push(v T) {\n\ts.items = append(s.items, v)\n}\n\nfunc (s *Stack[T]) Pop() (T, bool) {\n\tif len(s.items) == 0 {\n\t\tvar zero T\n\t\treturn zero, false\n\t}\n\tv := s.items[len(s.items)-1]\n\ts.items = s.items[:len(s.items)-1]\n\treturn v, true\n}"),
  item("go", "intermediate", "func groupBy[T any, K comparable](items []T, keyFn func(T) K) map[K][]T {\n\tout := map[K][]T{}\n\tfor _, item := range items {\n\t\tk := keyFn(item)\n\t\tout[k] = append(out[k], item)\n\t}\n\treturn out\n}"),
  item("go", "advanced", "func retry[T any](attempts int, fn func() (T, error)) (T, error) {\n\tvar zero T\n\tvar err error\n\tfor i := 0; i < attempts; i++ {\n\t\tvar value T\n\t\tvalue, err = fn()\n\t\tif err == nil {\n\t\t\treturn value, nil\n\t\t}\n\t}\n\treturn zero, err\n}"),
  item("go", "advanced", "type Result[T any] struct {\n\tValue T\n\tErr   error\n}\n\nfunc (r Result[T]) Unwrap() (T, error) {\n\treturn r.Value, r.Err\n}"),
  item("go", "advanced", "func worker(ctx context.Context, jobs <-chan int, results chan<- int) {\n\tfor {\n\t\tselect {\n\t\tcase <-ctx.Done():\n\t\t\treturn\n\t\tcase job, ok := <-jobs:\n\t\t\tif !ok {\n\t\t\t\treturn\n\t\t\t}\n\t\t\tresults <- job * 2\n\t\t}\n\t}\n}"),
]);

w("code_java.json", [
  item("java", "beginner", "public class Main {\n  static int add(int a, int b) {\n    return a + b;\n  }\n\n  public static void main(String[] args) {\n    System.out.println(add(2, 3));\n  }\n}"),
  item("java", "beginner", "import java.util.List;\n\npublic class Main {\n  public static void main(String[] args) {\n    var nums = List.of(1, 2, 3, 4);\n    nums.stream().map(n -> n * 2).forEach(System.out::println);\n  }\n}"),
  item("java", "beginner", "public class Greeter {\n  public static void main(String[] args) {\n    String name = \"Ada\";\n    System.out.println(\"hello \" + name);\n  }\n}"),
  item("java", "intermediate", "import java.util.Optional;\n\npublic class Users {\n  static Optional<String> findUser(long id) {\n    if (id <= 0) return Optional.empty();\n    return Optional.of(\"user-\" + id);\n  }\n}"),
  item("java", "intermediate", "import java.util.ArrayDeque;\n\npublic class Stack<T> {\n  private final ArrayDeque<T> items = new ArrayDeque<>();\n  public void push(T value) { items.push(value); }\n  public T pop() { return items.poll(); }\n}"),
  item("java", "intermediate", "import java.util.*;\nimport java.util.function.Function;\nimport java.util.stream.Collectors;\n\npublic class Grouping {\n  static <T, K> Map<K, List<T>> groupBy(List<T> items, Function<T, K> keyFn) {\n    return items.stream().collect(Collectors.groupingBy(keyFn));\n  }\n}"),
  item("java", "advanced", "public sealed interface Result<T> permits Result.Ok, Result.Err {\n  record Ok<T>(T value) implements Result<T> {}\n  record Err<T>(String message) implements Result<T> {}\n}"),
  item("java", "advanced", "public final class Retry {\n  public static <T> T run(int attempts, Callable<T> fn) throws Exception {\n    Exception last = null;\n    for (int i = 0; i < attempts; i++) {\n      try {\n        return fn.call();\n      } catch (Exception ex) {\n        last = ex;\n      }\n    }\n    throw last;\n  }\n}"),
  item("java", "advanced", "public record Page<T>(List<T> items, boolean hasNext) {\n  public static <T> Page<T> empty() {\n    return new Page<>(List.of(), false);\n  }\n}"),
]);

w("code_csharp.json", [
  item("csharp", "beginner", "using System;\n\nstatic int Add(int a, int b) => a + b;\n\nConsole.WriteLine(Add(2, 3));"),
  item("csharp", "beginner", "var numbers = new[] { 1, 2, 3, 4, 5 };\nvar doubled = numbers.Select(n => n * 2);\nforeach (var n in doubled) Console.WriteLine(n);"),
  item("csharp", "beginner", "var name = \"Ada\";\nif (!string.IsNullOrEmpty(name))\n{\n    Console.WriteLine($\"hello {name}\");\n}"),
  item("csharp", "intermediate", "string? FindUser(long id) => id <= 0 ? null : $\"user-{id}\";"),
  item("csharp", "intermediate", "public class Stack<T>\n{\n    private readonly List<T> _items = new();\n    public void Push(T value) => _items.Add(value);\n    public bool TryPop(out T value)\n    {\n        if (_items.Count == 0)\n        {\n            value = default!;\n            return false;\n        }\n        value = _items[^1];\n        _items.RemoveAt(_items.Count - 1);\n        return true;\n    }\n}"),
  item("csharp", "intermediate", "public static IDictionary<TKey, List<T>> GroupBy<T, TKey>(\n    IEnumerable<T> items,\n    Func<T, TKey> keyFn) where TKey : notnull\n{\n    return items.GroupBy(keyFn).ToDictionary(g => g.Key, g => g.ToList());\n}"),
  item("csharp", "advanced", "public abstract record Result<T>\n{\n    public sealed record Ok(T Value) : Result<T>;\n    public sealed record Err(string Message) : Result<T>;\n}"),
  item("csharp", "advanced", "public static async Task<T> RetryAsync<T>(Func<Task<T>> fn, int attempts = 3)\n{\n    Exception? last = null;\n    for (var i = 0; i < attempts; i++)\n    {\n        try { return await fn(); }\n        catch (Exception ex) { last = ex; }\n    }\n    throw last!;\n}"),
  item("csharp", "advanced", "public readonly record struct Page<T>(IReadOnlyList<T> Items, bool HasNext)\n{\n    public static Page<T> Empty => new(Array.Empty<T>(), false);\n}"),
]);

w("code_ruby.json", [
  item("ruby", "beginner", "def add(a, b)\n  a + b\nend\n\nputs add(2, 3)"),
  item("ruby", "beginner", "numbers = [1, 2, 3, 4, 5]\ndoubled = numbers.map { |n| n * 2 }\nputs doubled.inspect"),
  item("ruby", "beginner", "name = 'Ada'\nputs \"hello #{name}\" if name"),
  item("ruby", "intermediate", "def find_user(id)\n  return nil if id <= 0\n  \"user-#{id}\"\nend"),
  item("ruby", "intermediate", "class Stack\n  def initialize\n    @items = []\n  end\n\n  def push(value)\n    @items << value\n  end\n\n  def pop\n    @items.pop\n  end\nend"),
  item("ruby", "intermediate", "def group_by(items)\n  items.each_with_object(Hash.new { |h, k| h[k] = [] }) do |item, memo|\n    memo[yield(item)] << item\n  end\nend"),
  item("ruby", "advanced", "def retry_call(attempts: 3)\n  last_error = nil\n  attempts.times do\n    begin\n      return yield\n    rescue StandardError => e\n      last_error = e\n    end\n  end\n  raise last_error\nend"),
  item("ruby", "advanced", "Result = Struct.new(:ok, :value, :error, keyword_init: true) do\n  def self.ok(value) = new(ok: true, value: value, error: nil)\n  def self.err(error) = new(ok: false, value: nil, error: error)\nend"),
  item("ruby", "advanced", "module Enumerable\n  def map_compact\n    each_with_object([]) do |item, memo|\n      value = yield(item)\n      memo << value unless value.nil?\n    end\n  end\nend"),
]);

w("code_swift.json", [
  item("swift", "beginner", "func add(_ a: Int, _ b: Int) -> Int {\n  a + b\n}\n\nprint(add(2, 3))"),
  item("swift", "beginner", "let numbers = [1, 2, 3, 4, 5]\nlet doubled = numbers.map { $0 * 2 }\nprint(doubled)"),
  item("swift", "beginner", "let name = \"Ada\"\nif !name.isEmpty {\n  print(\"hello \\(name)\")\n}"),
  item("swift", "intermediate", "func findUser(id: Int64) -> String? {\n  guard id > 0 else { return nil }\n  return \"user-\\(id)\"\n}"),
  item("swift", "intermediate", "struct Stack<Element> {\n  private var items: [Element] = []\n  mutating func push(_ value: Element) { items.append(value) }\n  mutating func pop() -> Element? { items.popLast() }\n}"),
  item("swift", "intermediate", "func groupBy<T, K: Hashable>(_ items: [T], key: (T) -> K) -> [K: [T]] {\n  Dictionary(grouping: items, by: key)\n}"),
  item("swift", "advanced", "enum Result<T> {\n  case ok(T)\n  case err(String)\n}"),
  item("swift", "advanced", "func retry<T>(attempts: Int = 3, operation: () throws -> T) throws -> T {\n  var lastError: Error?\n  for _ in 0..<attempts {\n    do { return try operation() }\n    catch { lastError = error }\n  }\n  throw lastError!\n}"),
  item("swift", "advanced", "actor Counter {\n  private var value = 0\n  func increment() -> Int {\n    value += 1\n    return value\n  }\n}"),
]);

w("code_sql.json", [
  item("sql", "beginner", "SELECT id, name\nFROM users\nWHERE active = 1\nORDER BY name;"),
  item("sql", "beginner", "INSERT INTO users (name, email)\nVALUES ('Ada', 'ada@example.com');"),
  item("sql", "beginner", "UPDATE users\nSET active = 0\nWHERE last_login < CURRENT_DATE - INTERVAL '90 days';"),
  item("sql", "intermediate", "SELECT u.name, COUNT(o.id) AS order_count\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nGROUP BY u.name\nHAVING COUNT(o.id) > 3;"),
  item("sql", "intermediate", "WITH recent AS (\n  SELECT *\n  FROM sessions\n  WHERE created_at >= NOW() - INTERVAL '7 days'\n)\nSELECT user_id, COUNT(*) AS sessions\nFROM recent\nGROUP BY user_id;"),
  item("sql", "intermediate", "CREATE INDEX idx_orders_user_created\nON orders (user_id, created_at DESC);"),
  item("sql", "advanced", "SELECT DISTINCT ON (user_id)\n  user_id,\n  created_at,\n  wpm\nFROM sessions\nORDER BY user_id, wpm DESC, created_at DESC;"),
  item("sql", "advanced", "UPDATE products p\nSET price = p.price * 0.9\nFROM inventory i\nWHERE i.product_id = p.id\n  AND i.quantity > 100\n  AND p.category = 'clearance';"),
  item("sql", "advanced", "CREATE OR REPLACE FUNCTION touch_updated_at()\nRETURNS trigger AS $$\nBEGIN\n  NEW.updated_at = NOW();\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;"),
]);

w("code_php.json", [
  item("php", "beginner", "<?php\nfunction add(int $a, int $b): int {\n    return $a + $b;\n}\n\necho add(2, 3);"),
  item("php", "beginner", "<?php\n$numbers = [1, 2, 3, 4, 5];\n$doubled = array_map(fn($n) => $n * 2, $numbers);\nprint_r($doubled);"),
  item("php", "beginner", "<?php\n$name = 'Ada';\nif ($name) {\n    echo \"hello $name\";\n}"),
  item("php", "intermediate", "<?php\nfunction findUser(int $id): ?array {\n    if ($id <= 0) {\n        return null;\n    }\n    return ['id' => $id, 'name' => \"user-$id\"];\n}"),
  item("php", "intermediate", "<?php\nclass Stack {\n    private array $items = [];\n\n    public function push(mixed $value): void {\n        $this->items[] = $value;\n    }\n\n    public function pop(): mixed {\n        return array_pop($this->items);\n    }\n}"),
  item("php", "intermediate", "<?php\nfunction groupBy(array $items, callable $keyFn): array {\n    $grouped = [];\n    foreach ($items as $item) {\n        $key = $keyFn($item);\n        $grouped[$key][] = $item;\n    }\n    return $grouped;\n}"),
  item("php", "advanced", "<?php\nfinal class Result {\n    public function __construct(\n        public readonly mixed $value,\n        public readonly ?string $error = null,\n    ) {}\n\n    public function isOk(): bool {\n        return $this->error === null;\n    }\n}"),
  item("php", "advanced", "<?php\nfunction retry(callable $fn, int $attempts = 3): mixed {\n    $last = null;\n    for ($i = 0; $i < $attempts; $i++) {\n        try {\n            return $fn();\n        } catch (Throwable $e) {\n            $last = $e;\n        }\n    }\n    throw $last;\n}"),
  item("php", "advanced", "<?php\ninterface Repository {\n    public function find(string $id): ?object;\n    public function save(object $entity): void;\n}"),
]);

w("code_kotlin.json", [
  item("kotlin", "beginner", "fun add(a: Int, b: Int): Int = a + b\n\nfun main() {\n    println(add(2, 3))\n}"),
  item("kotlin", "beginner", "fun main() {\n    val numbers = listOf(1, 2, 3, 4, 5)\n    val doubled = numbers.map { it * 2 }\n    println(doubled)\n}"),
  item("kotlin", "beginner", "fun main() {\n    val name = \"Ada\"\n    if (name.isNotEmpty()) {\n        println(\"hello $name\")\n    }\n}"),
  item("kotlin", "intermediate", "fun findUser(id: Long): Map<String, Any>? {\n    if (id <= 0) return null\n    return mapOf(\"id\" to id, \"name\" to \"user-$id\")\n}"),
  item("kotlin", "intermediate", "class Stack<T> {\n    private val items = mutableListOf<T>()\n    fun push(value: T) = items.add(value)\n    fun pop(): T? = items.removeLastOrNull()\n}"),
  item("kotlin", "intermediate", "fun <T, K> List<T>.groupByKey(keyFn: (T) -> K): Map<K, List<T>> {\n    val grouped = linkedMapOf<K, MutableList<T>>()\n    for (item in this) {\n        grouped.getOrPut(keyFn(item)) { mutableListOf() }.add(item)\n    }\n    return grouped\n}"),
  item("kotlin", "advanced", "sealed interface Result<out T> {\n    data class Ok<T>(val value: T) : Result<T>\n    data class Err(val message: String) : Result<Nothing>\n}"),
  item("kotlin", "advanced", "suspend fun fetchJson(url: String): String {\n    return httpClient.get(url).bodyAsText()\n}"),
  item("kotlin", "advanced", "inline fun <T> retry(attempts: Int = 3, block: () -> T): T {\n    var last: Throwable? = null\n    repeat(attempts) {\n        try {\n            return block()\n        } catch (t: Throwable) {\n            last = t\n        }\n    }\n    throw last!!\n}"),
]);

w("code_rust.json", [
  item("rust", "beginner", "fn add(a: i32, b: i32) -> i32 {\n    a + b\n}\n\nfn main() {\n    println!(\"{}\", add(2, 3));\n}"),
  item("rust", "beginner", "fn main() {\n    let nums = vec![1, 2, 3, 4];\n    let doubled: Vec<_> = nums.iter().map(|n| n * 2).collect();\n    println!(\"{:?}\", doubled);\n}"),
  item("rust", "beginner", "fn main() {\n    let name = \"Ada\";\n    println!(\"hello {name}\");\n}"),
  item("rust", "intermediate", "fn find_user(id: i64) -> Option<String> {\n    if id <= 0 {\n        None\n    } else {\n        Some(format!(\"user-{id}\"))\n    }\n}"),
  item("rust", "intermediate", "struct Stack<T> {\n    items: Vec<T>,\n}\n\nimpl<T> Stack<T> {\n    fn new() -> Self { Self { items: Vec::new() } }\n    fn push(&mut self, value: T) { self.items.push(value); }\n    fn pop(&mut self) -> Option<T> { self.items.pop() }\n}"),
  item("rust", "intermediate", "fn average(values: &[f64]) -> Option<f64> {\n    if values.is_empty() {\n        None\n    } else {\n        Some(values.iter().sum::<f64>() / values.len() as f64)\n    }\n}"),
  item("rust", "advanced", "use std::collections::HashMap;\n\nfn group_by<T, K, F>(items: Vec<T>, key_fn: F) -> HashMap<K, Vec<T>>\nwhere\n    K: Eq + std::hash::Hash,\n    F: Fn(&T) -> K,\n{\n    let mut map = HashMap::new();\n    for item in items {\n        map.entry(key_fn(&item)).or_default().push(item);\n    }\n    map\n}"),
  item("rust", "advanced", "async fn fetch_json(url: &str) -> Result<serde_json::Value, reqwest::Error> {\n    let response = reqwest::get(url).await?.error_for_status()?;\n    response.json().await\n}"),
  item("rust", "advanced", "pub enum RetryError {\n    Exhausted,\n    Fatal(String),\n}\n\npub fn retry<T, E, F>(mut attempts: u32, mut f: F) -> Result<T, RetryError>\nwhere\n    F: FnMut() -> Result<T, E>,\n{\n    while attempts > 0 {\n        match f() {\n            Ok(value) => return Ok(value),\n            Err(_) if attempts > 1 => attempts -= 1,\n            Err(_) => return Err(RetryError::Exhausted),\n        }\n    }\n    Err(RetryError::Exhausted)\n}"),
]);

w("code_cpp.json", [
  item("cpp", "beginner", "#include <iostream>\n\nint add(int a, int b) {\n  return a + b;\n}\n\nint main() {\n  std::cout << add(2, 3) << std::endl;\n  return 0;\n}"),
  item("cpp", "beginner", "#include <vector>\n#include <iostream>\n\nint main() {\n  std::vector<int> nums = {1, 2, 3};\n  for (int n : nums) std::cout << n << ' ';\n}"),
  item("cpp", "beginner", "#include <string>\n#include <iostream>\n\nint main() {\n  std::string name = \"Ada\";\n  std::cout << \"hello \" << name << '\\n';\n}"),
  item("cpp", "intermediate", "#include <string>\n#include <optional>\n\nstd::optional<std::string> find_user(int id) {\n  if (id <= 0) return std::nullopt;\n  return std::string(\"user-\") + std::to_string(id);\n}"),
  item("cpp", "intermediate", "template <typename T>\nclass Stack {\n public:\n  void push(const T& value) { data_.push_back(value); }\n  T pop() {\n    T value = data_.back();\n    data_.pop_back();\n    return value;\n  }\n private:\n  std::vector<T> data_;\n};"),
  item("cpp", "intermediate", "#include <algorithm>\n#include <vector>\n\nint main() {\n  std::vector<int> values = {4, 1, 3, 2};\n  std::sort(values.begin(), values.end());\n}"),
  item("cpp", "advanced", "template <typename Iter, typename Pred>\nauto partition_copy_if(Iter first, Iter last, Pred pred) {\n  using T = typename std::iterator_traits<Iter>::value_type;\n  std::vector<T> matched, rest;\n  for (; first != last; ++first) {\n    (pred(*first) ? matched : rest).push_back(*first);\n  }\n  return std::pair{std::move(matched), std::move(rest)};\n}"),
  item("cpp", "advanced", "class ScopeGuard {\n public:\n  explicit ScopeGuard(std::function<void()> fn) : fn_(std::move(fn)) {}\n  ~ScopeGuard() { if (fn_) fn_(); }\n  ScopeGuard(const ScopeGuard&) = delete;\n  ScopeGuard& operator=(const ScopeGuard&) = delete;\n private:\n  std::function<void()> fn_;\n};"),
  item("cpp", "advanced", "template <typename T>\nconcept Addable = requires(T a, T b) {\n  { a + b } -> std::convertible_to<T>;\n};\n\ntemplate <Addable T>\nT sum(T a, T b) { return a + b; }"),
]);

console.log("all seeds written");
