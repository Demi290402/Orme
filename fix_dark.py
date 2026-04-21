import re

path = r"c:\Users\cistu\.gemini\antigravity\scratch\orme\src\pages\Verbali\VerbaleEditor.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

text = re.sub(r'(?<!dark:)bg-white', 'bg-white dark:bg-gray-800', text)
text = re.sub(r'(?<!dark:)bg-gray-50/50', 'bg-gray-50/50 dark:bg-gray-700/50', text)
text = re.sub(r'(?<!dark:)bg-gray-50', 'bg-gray-50 dark:bg-gray-700', text)
text = re.sub(r'(?<!dark:)border-gray-100', 'border-gray-100 dark:border-gray-700', text)
text = re.sub(r'(?<!dark:)text-gray-800', 'text-gray-800 dark:text-gray-100', text)
text = re.sub(r'(?<!dark:)text-gray-500', 'text-gray-500 dark:text-gray-300', text)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
