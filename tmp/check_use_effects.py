import os

def check_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.splitlines()
    for i, line in enumerate(lines):
        if "useEffect(" in line or "useEffect (" in line:
            # find where this line is in content
            # find the line's occurrence
            paren_idx = line.find("useEffect")
            if paren_idx == -1:
                continue
            # search in whole file
            # let's find the character offset of line
            offset = sum(len(l) + 1 for l in lines[:i]) + paren_idx
            p_start = content.find("(", offset)
            if p_start == -1:
                continue
            depth = 1
            idx = p_start + 1
            in_str = None
            while idx < len(content) and depth > 0:
                ch = content[idx]
                if in_str:
                    if ch == "\\" and idx + 1 < len(content):
                        idx += 2
                        continue
                    if ch == in_str:
                        in_str = None
                else:
                    if ch in ('"', "'", "`"):
                        in_str = ch
                    elif ch == "(":
                        depth += 1
                    elif ch == ")":
                        depth -= 1
                        if depth == 0:
                            break
                idx += 1
            
            call_content = content[p_start+1:idx]
            # Find comma at depth 0
            b_depth = 0
            comma_idx = -1
            in_s = None
            for c_i, c in enumerate(call_content):
                if in_s:
                    if c == "\\" and c_i + 1 < len(call_content):
                        continue
                    if c == in_s:
                        in_s = None
                else:
                    if c in ('"', "'", "`"):
                        in_s = c
                    elif c in ("{", "(", "["):
                        b_depth += 1
                    elif c in ("}", ")", "]"):
                        b_depth -= 1
                    elif c == "," and b_depth == 0:
                        comma_idx = c_i
                        break
            
            if comma_idx == -1:
                print(f"[MISSING DEPS] {path}:{i+1}")
            else:
                deps = call_content[comma_idx+1:].strip()
                if not (deps.startswith("[") and deps.endswith("]")):
                    print(f"[NON-ARRAY DEPS] {path}:{i+1} -> {deps}")
                else:
                    inner = deps[1:-1].strip()
                    items = [x.strip() for x in inner.split(",") if x.strip()]
                    for item in items:
                        if "{" in item or "(" in item or "?" in item or "[" in item:
                            print(f"[UNSTABLE OR EXPRESSION DEP] {path}:{i+1} -> {item}")

for root, dirs, files in os.walk("./src"):
    if "node_modules" in root or ".git" in root or "dist" in root:
        continue
    for f in files:
        if f.endswith(".tsx") or f.endswith(".ts"):
            check_file(os.path.join(root, f))
