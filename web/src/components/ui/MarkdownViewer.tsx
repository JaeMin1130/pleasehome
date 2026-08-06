import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MarkdownViewer.module.css';

// ==========================================
// 깃허브 스타일 얼럿 박스 및 표준 인용구 처리 컴포넌트
// ==========================================
const CustomBlockquote = ({ children }: { children: React.ReactNode }) => {
  const childrenArray = React.Children.toArray(children);
  
  if (childrenArray.length > 0) {
    const firstChild = childrenArray[0];
    
    // blockquote 내 첫 번째 p 태그를 뒤져 얼럿 식별 키워드가 들어있는지 파악
    if (React.isValidElement(firstChild)) {
      const element = firstChild as React.ReactElement<any>;
      if (element.props && element.props.children) {
        const pChildren = React.Children.toArray(element.props.children);
        if (pChildren.length > 0 && typeof pChildren[0] === 'string') {
          const text = pChildren[0];
          const match = text.match(/^\[!(NOTE|WARNING|IMPORTANT|TIP|CAUTION)\]\s*(.*)$/i);
          
          if (match) {
            const type = match[1].toUpperCase();
            const restText = match[2];
            
            // [!TYPE] 수식어 제거 및 나머지 텍스트로 대체
            const newPChildren = [...pChildren];
            if (restText.trim() === '') {
              newPChildren.shift();
            } else {
              newPChildren[0] = restText;
            }
            
            const newFirstChild = React.cloneElement(element, {}, ...newPChildren);
            const remainingChildren = childrenArray.slice(1);
            
            let alertClass = styles['md-alert-note'];
            let title = '안내';
            if (type === 'WARNING') {
              alertClass = styles['md-alert-warning'];
              title = '경고';
            } else if (type === 'IMPORTANT') {
              alertClass = styles['md-alert-important'];
              title = '중요';
            } else if (type === 'TIP') {
              alertClass = styles['md-alert-tip'];
              title = '팁';
            } else if (type === 'CAUTION') {
              alertClass = styles['md-alert-caution'];
              title = '주의';
            }
            
            return (
              <div className={`${styles['md-alert']} ${alertClass}`}>
                <div className={styles['md-alert-title']}>{title}</div>
                <div className={styles['md-alert-content']}>
                  {newFirstChild}
                  {remainingChildren}
                </div>
              </div>
            );
          }
        }
      }
    }
  }
  
  return <blockquote className={styles['md-blockquote']}>{children}</blockquote>;
};

interface MarkdownViewerProps {
  content: string;
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  if (!content) return null;

  return (
    <div className={styles['md-container']}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className={styles['md-h4']}>{children}</h2>, // 크기 밸런스를 위해 h1~h3은 h4 스타일 매핑
          h2: ({ children }) => <h2 className={styles['md-h4']}>{children}</h2>,
          h3: ({ children }) => <h3 className={styles['md-h4']}>{children}</h3>,
          h4: ({ children }) => <h4 className={styles['md-h4']}>{children}</h4>,
          h5: ({ children }) => <h5 className={styles['md-h5']}>{children}</h5>,
          h6: ({ children }) => <h6 className={styles['md-h5']}>{children}</h6>,
          p: ({ children }) => <p className={styles['md-p']}>{children}</p>,
          strong: ({ children }) => <strong className={styles['md-bold']}>{children}</strong>,
          em: ({ children }) => <em className={styles['md-italic']}>{children}</em>,
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return match ? (
              <pre className={styles['md-pre-block']}>
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className={styles['md-code']} {...props}>
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className={styles['md-link']}>
              {children}
            </a>
          ),
          hr: () => <hr className={styles['md-hr']} />,
          ul: ({ children }) => <ul className={styles['md-ul']}>{children}</ul>,
          ol: ({ children }) => <ol className={styles['md-ol']}>{children}</ol>,
          li: ({ children }) => <li className={styles['md-li-item']}>{children}</li>,
          table: ({ children }) => (
            <div className={styles['md-table-container']}>
              <table className={styles['md-table']}>{children}</table>
            </div>
          ),
          tr: ({ children }) => <tr className={styles['md-tr']}>{children}</tr>,
          th: ({ children }) => <th className={styles['md-th']}>{children}</th>,
          td: ({ children }) => <td className={styles['md-td']}>{children}</td>,
          blockquote: ({ children }) => <CustomBlockquote>{children}</CustomBlockquote>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
