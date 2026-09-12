import { useEffect, useState } from 'react';

export default function AnimatedDisclosure({ open, children, className = '' }) {
  const [renderedChildren, setRenderedChildren] = useState(open ? children : null);

  useEffect(() => {
    if (open) {
      // Keep the last content mounted long enough to animate the closing transition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRenderedChildren(children);
    }
  }, [children, open]);

  function handleTransitionEnd(event) {
    if (!open && event.target === event.currentTarget && event.propertyName === 'grid-template-rows') {
      setRenderedChildren(null);
    }
  }

  return (
    <div
      className={`animated-disclosure ${open ? 'animated-disclosure-open' : ''} ${className}`}
      aria-hidden={!open}
      inert={!open}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="animated-disclosure-inner">{renderedChildren}</div>
    </div>
  );
}
