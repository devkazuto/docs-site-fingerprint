import React, { useState } from 'react';
import CodeBlock from '@theme/CodeBlock';

interface CodeExample {
  label: string;
  language: string;
  code: string;
}

interface CodeTabsProps {
  examples: CodeExample[];
}

export default function CodeTabs({ examples }: CodeTabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState(0);

  if (!examples || examples.length === 0) {
    return <div>No code examples provided</div>;
  }

  return (
    <div className="code-tabs">
      <div className="code-tabs__header">
        {examples.map((example, index) => (
          <button
            key={index}
            className={`code-tabs__tab ${activeTab === index ? 'code-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab(index)}
            type="button"
          >
            {example.label}
          </button>
        ))}
      </div>
      <div className="code-tabs__content">
        <CodeBlock language={examples[activeTab].language}>
          {examples[activeTab].code}
        </CodeBlock>
      </div>
    </div>
  );
}
