import React from 'react';
import styles from './MarkdownViewer.module.css';

// 인라인 마크다운 (볼드, 이탤릭, 인라인 코드, 링크) 파싱 및 토큰화 헬퍼 함수
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [];
  
  // 1. 초기 텍스트 노드 상태 정의
  let parts: { type: 'text' | 'bold' | 'italic' | 'code' | 'link'; content: string; url?: string }[] = [
    { type: 'text', content: text }
  ];

  // 2. 볼드 처리 (**bold**)
  parts = parts.flatMap(part => {
    if (part.type !== 'text') return [part];
    const subParts = part.content.split(/(\*\*.*?\*\*)/g);
    return subParts.map(sp => {
      if (sp.startsWith('**') && sp.endsWith('**')) {
        return { type: 'bold', content: sp.slice(2, -2) };
      }
      return { type: 'text', content: sp };
    });
  });

  // 3. 이탤릭 처리 (*italic* 또는 _italic_)
  parts = parts.flatMap(part => {
    if (part.type !== 'text') return [part];
    const subParts = part.content.split(/(\*.*?\*|__.*?__|_.*?_)/g);
    return subParts.map(sp => {
      if ((sp.startsWith('*') && sp.endsWith('*')) || (sp.startsWith('_') && sp.endsWith('_'))) {
        const cleanContent = sp.slice(1, -1);
        return { type: 'italic', content: cleanContent };
      }
      return { type: 'text', content: sp };
    });
  });

  // 4. 인라인 코드 처리 (`code`)
  parts = parts.flatMap(part => {
    if (part.type !== 'text') return [part];
    const subParts = part.content.split(/(`.*?`)/g);
    return subParts.map(sp => {
      if (sp.startsWith('`') && sp.endsWith('`')) {
        return { type: 'code', content: sp.slice(1, -1) };
      }
      return { type: 'text', content: sp };
    });
  });

  // 5. 링크 처리 ([text](url))
  parts = parts.flatMap(part => {
    if (part.type !== 'text') return [part];
    const subParts = part.content.split(/(\[.*?\]\(.*?\))/g);
    return subParts.map(sp => {
      const match = sp.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return { type: 'link', content: match[1], url: match[2] };
      }
      return { type: 'text', content: sp };
    });
  });

  // 6. 각 토큰 타입을 React 컴포넌트로 스타일링하여 맵핑
  return parts.map((part, idx) => {
    switch (part.type) {
      case 'bold':
        return (
          <strong key={idx} className={styles['md-bold']}>
            {part.content}
          </strong>
        );
      case 'italic':
        return (
          <em key={idx} className={styles['md-italic']}>
            {part.content}
          </em>
        );
      case 'code':
        return (
          <code key={idx} className={styles['md-code']}>
            {part.content}
          </code>
        );
      case 'link':
        return (
          <a key={idx} href={part.url} target="_blank" rel="noopener noreferrer" className={styles['md-link']}>
            {part.content}
          </a>
        );
      default:
        return part.content;
    }
  });
};

interface MarkdownViewerProps {
  content: string;
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  if (!content) return null;
  
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string | number) => {
    if (tableRows.length === 0) return null;
    
    let hasHeader = false;
    let headerRow: string[] = [];
    let bodyRows: string[][] = [];
    
    if (tableRows.length >= 2) {
      const isDivider = tableRows[1].every(cell => /^[:\-\s]+$/.test(cell.trim()));
      if (isDivider) {
        hasHeader = true;
        headerRow = tableRows[0];
        bodyRows = tableRows.slice(2);
      } else {
        bodyRows = tableRows;
      }
    } else {
      bodyRows = tableRows;
    }

    const R = bodyRows.length;
    const C = R > 0 ? bodyRows[0].length : 0;
    const rowSpans = Array.from({ length: R }, () => Array(C).fill(1));
    const showCell = Array.from({ length: R }, () => Array(C).fill(true));

    if (C > 0) {
      let r = 0;
      while (r < R) {
        let span = 1;
        const currentText = bodyRows[r][0].trim();
        if (currentText !== '') {
          while (
            r + span < R && 
            bodyRows[r + span][0].trim() === currentText
          ) {
            rowSpans[r][0] = span + 1;
            showCell[r + span][0] = false;
            span++;
          }
        }
        r += span;
      }
    }

    const element = (
      <div key={key} className={styles['md-table-container']}>
        <table className={styles['md-table']}>
          {hasHeader && (
            <thead>
              <tr className={styles['md-thead-tr']}>
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className={styles['md-th']}>
                    {parseInlineMarkdown(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className={styles['md-tr']}>
                {row.map((cell, cIdx) => {
                  if (!showCell[rIdx][cIdx]) return null;
                  
                  return (
                    <td 
                      key={cIdx} 
                      rowSpan={rowSpans[rIdx][cIdx]}
                      className={`${styles['md-td']} ${rowSpans[rIdx][cIdx] > 1 ? styles['md-td-span'] : ''}`}
                    >
                      {parseInlineMarkdown(cell.trim())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    
    tableRows = [];
    inTable = false;
    return element;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const content = line.trim();
    
    if (content === '---' || content === '***' || content === '___') {
      if (inTable) {
        const tableElement = flushTable(`table-${i}`);
        if (tableElement) renderedElements.push(tableElement);
      }
      renderedElements.push(<hr key={`hr-${i}`} className={styles['md-hr']} />);
      i++;
      continue;
    }
    
    const isTableRow = content.startsWith('|') && content.endsWith('|');
    
    if (isTableRow) {
      inTable = true;
      const cells = content.slice(1, -1).split('|');
      tableRows.push(cells);
      i++;
      continue;
    } else {
      if (inTable) {
        const tableElement = flushTable(`table-${i}`);
        if (tableElement) renderedElements.push(tableElement);
      }
    }
    
    const headerMatch = content.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const titleText = headerMatch[2];
      const parsedTitle = parseInlineMarkdown(titleText);
      
      if (level <= 3) {
        renderedElements.push(<h4 key={`h-${i}`} className={styles['md-h4']}>{parsedTitle}</h4>);
      } else {
        renderedElements.push(<h5 key={`h-${i}`} className={styles['md-h5']}>{parsedTitle}</h5>);
      }
      i++;
      continue;
    }
    
    const listMatch = content.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      const listText = listMatch[1];
      renderedElements.push(
        <div key={`li-${i}`} className={styles['md-li']}>
          <span className={styles['md-bullet']}>•</span>
          <div className={styles['md-text']}>{parseInlineMarkdown(listText)}</div>
        </div>
      );
      i++;
      continue;
    }

    const orderedListMatch = content.match(/^(\d+)\.\s+(.*)$/);
    if (orderedListMatch) {
      const num = orderedListMatch[1];
      const listText = orderedListMatch[2];
      renderedElements.push(
        <div key={`ol-${i}`} className={styles['md-li']}>
          <span className={styles['md-bullet-num']}>{num}.</span>
          <div className={styles['md-text']}>{parseInlineMarkdown(listText)}</div>
        </div>
      );
      i++;
      continue;
    }
    
    if (content === '') {
      renderedElements.push(<div key={`empty-${i}`} className={styles['md-empty-space']} />);
      i++;
      continue;
    }
    
    renderedElements.push(
      <p key={`p-${i}`} className={styles['md-p']}>
        {parseInlineMarkdown(content)}
      </p>
    );
    
    i++;
  }
  
  if (inTable) {
    const tableElement = flushTable(`table-end`);
    if (tableElement) renderedElements.push(tableElement);
  }

  return (
    <div className={styles['md-container']}>
      {renderedElements}
    </div>
  );
}
