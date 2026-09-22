import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';

/**
 * MathRenderer – renders rich HTML that may contain:
 *   1. <span data-latex="..."> elements (from TipTap editor / AI extraction)
 *   2. Raw LaTeX delimiters ($...$, $$...$$, \(...\), \[...\])
 */
const MathRenderer = ({ html, className = '', inline = false, style = {} }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const rawContent = String(html ?? '');
        // Convert plain text newlines to <br/> if not already HTML
        const formattedContent = rawContent.includes('<') && rawContent.includes('>')
            ? rawContent
            : rawContent.replace(/\n/g, '<br/>');

        // 1. Set raw HTML
        el.innerHTML = formattedContent;

        // 2. Walk every data-latex span and render KaTeX in-place
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

        // 3. Auto-render any remaining raw LaTeX formulas in text nodes
        try {
            renderMathInElement(el, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false,
                ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
            });
        } catch (e) {
            // ignore if katex auto-render encounters an edge case
        }
    }, [html]);

    if (!html && html !== 0) return null;

    if (inline) {
        return <span ref={containerRef} className={`inline ${className}`} style={{ color: 'inherit', ...style }} />;
    }

    return <div ref={containerRef} className={`${className}`} style={{ color: 'inherit', ...style }} />;
};

export default MathRenderer;

