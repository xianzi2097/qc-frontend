import type { Language } from './compilerApi';

/** 各语言的默认代码模板 */
export const CODE_TEMPLATES: Record<Language, string> = {
  python: `# Python 在线编译器
name = input()
print(f"Hello, {name}!")
`,

  cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    cin >> name;
    cout << "Hello, " << name << "!" << endl;
    return 0;
}
`,
};
