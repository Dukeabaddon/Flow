import React from 'react';

export function FlowLogo() {
  return (
    <div className="flow-logo" aria-label="Flow">
      <svg
        className="flow-logo__mark"
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M4 16c4-8 8-8 12 0s8 8 12 0"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M4 22c4-6 8-6 12 0s8 6 12 0"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="flow-logo__text">FLOW</span>
    </div>
  );
}
