import React from 'react';

interface ApiEndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth?: boolean;
}

export default function ApiEndpoint({ 
  method, 
  path, 
  description, 
  auth = true 
}: ApiEndpointProps): JSX.Element {
  const methodColors = {
    GET: '#61affe',
    POST: '#49cc90',
    PUT: '#fca130',
    DELETE: '#f93e3e',
  };

  return (
    <div className="api-endpoint">
      <div className="api-endpoint-header">
        <span 
          className="api-method" 
          style={{ backgroundColor: methodColors[method] }}
        >
          {method}
        </span>
        <code className="api-path">{path}</code>
        {auth && (
          <span className="api-auth" title="Requires API Key Authentication">
            🔒 Auth Required
          </span>
        )}
      </div>
      <p className="api-description">{description}</p>
    </div>
  );
}
