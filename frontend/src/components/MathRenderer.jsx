import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * MathRenderer – renders rich HTML that may contain
 *   <span data-latex="..."> elements (from TipTap editor / AI extraction).
 *
 * KEY DESIGN: We intentionally do NOT use dangerouslySetInnerHTML.
 * Instead we set innerHTML manually inside useEffect so React's reconciler
 * never overwrites the KaTeX-rendered DOM on re-renders triggered by
 * parent state changes (e.g. selecting an answer option).
 *
 * Usage:
 *   <MathRenderer html={someHtmlString} className="prose text-sm" />
 */
const MathRenderer = ({ html, className = '' }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // 1. Set raw HTML — done here instead of dangerouslySetInnerHTML so
        //    React never touches this node's children during reconciliation.
        el.innerHTML = html || '';

        // 2. Walk every data-latex span and render KaTeX in-place.
        const spans = el.querySelectorAll('span[data-latex]');
        spans.forEach(span => {
            const latex = span.getAttribute('data-latex') || '';
            const displayMode = span.getAttribute('data-display-mode') === 'true';
            try {
                katex.render(latex, span, { throwOnError: false, displayMode });
            } catch (e) {
                span.textContent = latex;
            }
        });
    }, [html]);

    if (!html) return null;

    // Empty div — content is managed entirely by the useEffect above.
    return <div ref={containerRef} className={className} />;
};

export default MathRenderer;
