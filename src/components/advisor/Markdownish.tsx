import { Fragment, type ReactNode } from 'react';

/**
 * Minimal, safe markdown renderer for advisor output — headings, bullet lists,
 * paragraphs and **bold**. Builds React nodes directly (no dangerouslySetInnerHTML),
 * so there's no HTML injection surface and no extra dependency.
 */

function renderInline(text: string): ReactNode[] {
  // Split on **bold** runs; odd indices are the bold segments.
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-stone-900">
        {part}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export function Markdownish({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let paragraph: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(
        <p key={key++} className="text-stone-700 leading-relaxed mb-3">
          {renderInline(paragraph.join(' '))}
        </p>
      );
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length) {
      blocks.push(
        <ul key={key++} className="list-disc pl-5 mb-3 space-y-1 text-stone-700">
          {listItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);

    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      const cls =
        level === 1
          ? 'text-lg font-semibold text-stone-900 mt-4 mb-2'
          : level === 2
            ? 'text-base font-semibold text-stone-900 mt-4 mb-2'
            : 'text-sm font-semibold text-stone-800 mt-3 mb-1';
      blocks.push(
        <p key={key++} className={cls}>
          {content}
        </p>
      );
    } else if (bullet) {
      flushParagraph();
      listItems.push(bullet[1]);
    } else if (line.trim() === '') {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();

  return <div>{blocks}</div>;
}
