import React from 'react';

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
          <strong key={idx} style={{ fontWeight: '700', color: 'hsl(var(--text-primary))' }}>
            {part.content}
          </strong>
        );
      case 'italic':
        return (
          <em key={idx} style={{ fontStyle: 'italic', color: 'hsl(var(--text-primary))' }}>
            {part.content}
          </em>
        );
      case 'code':
        return (
          <code 
            key={idx} 
            style={{ 
              backgroundColor: 'hsl(var(--accent) / 0.15)', 
              padding: '2px 5px', 
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.85em',
              color: 'hsl(var(--text-primary))'
            }}
          >
            {part.content}
          </code>
        );
      case 'link':
        return (
          <a 
            key={idx} 
            href={part.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              color: 'hsl(var(--accent-hover))', 
              textDecoration: 'underline' 
            }}
          >
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
      <div key={key} style={{ overflowX: 'auto', margin: '8px 0', width: '100%' }}>
        <table 
          style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '0.72rem', 
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--text-secondary))'
          }}
        >
          {hasHeader && (
            <thead>
              <tr style={{ backgroundColor: 'hsl(var(--accent) / 0.08)', borderBottom: '2px solid hsl(var(--border))' }}>
                {headerRow.map((cell, cIdx) => (
                  <th 
                    key={cIdx} 
                    style={{ 
                      padding: '6px 8px', 
                      textAlign: 'left', 
                      fontWeight: '700',
                      borderRight: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--text-primary))'
                    }}
                  >
                    {parseInlineMarkdown(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {bodyRows.map((row, rIdx) => (
              <tr 
                key={rIdx} 
                style={{ 
                  borderBottom: '1px solid hsl(var(--border))',
                  backgroundColor: rIdx % 2 === 1 ? 'hsl(var(--accent) / 0.02)' : 'transparent'
                }}
              >
                {row.map((cell, cIdx) => {
                  if (!showCell[rIdx][cIdx]) return null;
                  
                  return (
                    <td 
                      key={cIdx} 
                      rowSpan={rowSpans[rIdx][cIdx]}
                      style={{ 
                        padding: '5px 8px',
                        borderRight: '1px solid hsl(var(--border))',
                        lineHeight: '1.45',
                        verticalAlign: 'middle',
                        backgroundColor: rowSpans[rIdx][cIdx] > 1 ? 'hsl(var(--accent) / 0.04)' : undefined
                      }}
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
      renderedElements.push(
        <hr 
          key={`hr-${i}`} 
          style={{ 
            border: 'none', 
            borderTop: '1px solid hsl(var(--border))', 
            margin: '12px 0 8px 0' 
          }} 
        />
      );
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
        renderedElements.push(
          <h4 
            key={`h-${i}`} 
            style={{ 
              fontSize: '0.8rem', 
              fontWeight: '700', 
              margin: '12px 0 6px 0', 
              color: 'hsl(var(--text-primary))',
              borderBottom: '1px solid hsl(var(--border))',
              paddingBottom: '4px'
            }}
          >
            {parsedTitle}
          </h4>
        );
      } else {
        renderedElements.push(
          <h5 
            key={`h-${i}`} 
            style={{ 
              fontSize: '0.75rem', 
              fontWeight: '700', 
              margin: '8px 0 4px 0', 
              color: 'hsl(var(--text-primary))' 
            }}
          >
            {parsedTitle}
          </h5>
        );
      }
      i++;
      continue;
    }
    
    const listMatch = content.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      const listText = listMatch[1];
      renderedElements.push(
        <div 
          key={`li-${i}`} 
          style={{ 
            display: 'flex', 
            gap: '6px', 
            paddingLeft: '4px', 
            margin: '2px 0', 
            fontSize: '0.75rem', 
            lineHeight: '1.4' 
          }}
        >
          <span style={{ color: 'hsl(var(--accent-hover))', userSelect: 'none' }}>•</span>
          <div style={{ color: 'hsl(var(--text-secondary))' }}>{parseInlineMarkdown(listText)}</div>
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
        <div 
          key={`ol-${i}`} 
          style={{ 
            display: 'flex', 
            gap: '6px', 
            paddingLeft: '4px', 
            margin: '2px 0', 
            fontSize: '0.75rem', 
            lineHeight: '1.4' 
          }}
        >
          <span style={{ color: 'hsl(var(--accent-hover))', fontWeight: '700', userSelect: 'none' }}>
            {num}.
          </span>
          <div style={{ color: 'hsl(var(--text-secondary))' }}>
            {parseInlineMarkdown(listText)}
          </div>
        </div>
      );
      i++;
      continue;
    }
    
    if (content === '') {
      renderedElements.push(<div key={`empty-${i}`} style={{ height: '4px' }} />);
      i++;
      continue;
    }
    
    renderedElements.push(
      <p 
        key={`p-${i}`} 
        style={{ 
          fontSize: '0.75rem', 
          margin: '2px 0', 
          lineHeight: '1.4', 
          color: 'hsl(var(--text-secondary))' 
        }}
      >
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
      {renderedElements}
    </div>
  );
}
