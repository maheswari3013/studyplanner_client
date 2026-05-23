from pathlib import Path
import re
path = Path('src/components/TodaysAgenda.jsx')
text = path.read_text('utf-8')
pattern = re.compile(r'\n\s*<div className="block-card-header">.*?\n\s*\n\s*\{editingBlock && \(', re.S)
new_text, count = pattern.subn('\n      {editingBlock && (', text, count=1)
print('matches', count)
if count:
    path.write_text(new_text, 'utf-8')
