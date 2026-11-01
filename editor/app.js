/*
Quiz-App Editor
-> Handles user interactions and live preview.
*/

// =============================================================================
// 1. Dom Elements
// =============================================================================


// Get references to the HTML elements
const editor = document.getElementById('question-editor');
const preview = document.getElementById('preview');


// =============================================================================
// 2. Functions
// =============================================================================

/*
    Converts markdown into sanitized HTML
    and updates the preview. 
*/
function updatePreview() {
    const markdown = editor.value; 
    const html = marked.parse(markdown);
    const safeHTML = DOMPurify.sanitize(html);

    preview.innerHTML = safeHTML;

    // Render LaTeX expressions inside the preview 
    renderMathInElement(preview, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ]
    });
}


/**
 * 
 * @param {boolean} display - Whether to use display math.
 */
function insertMath(display = false) {

    // Identify the current selection
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    // Determine the spacing needed before display math 
    const textBefore = editor.value.slice(0, start);
    const prefix  = !display || textBefore.length === 0 ? ''
        : textBefore.endsWith('\n\n') ? ''
            : textBefore.endsWith('\n') ? '\n': '\n\n';

    // Define the opening and closing delimiters 
    const opening = display ? '$$\n': '$';
    const closing = display ? '\n$$': '$';

    
    // Preserve any text selected by the user.
    const selectedText = editor.value.slice(start, end);

    // Wrap the selection in mathematical delimiters.
    editor.setRangeText(`${prefix}${opening}${selectedText}${closing}`, start, end);

    // Position the cursor inside the math environment.
    const cursorPosition = start + prefix.length + opening.length + selectedText.length; 
    editor.setSelectionRange(cursorPosition, cursorPosition);

    // Return keyboard focus to the editor.
    editor.focus();

    // Notify the preview that the content has changed.
    editor.dispatchEvent(new Event('input', { bubbles: true }));
};


// =============================================================================
// 3. Event Listeners
// =============================================================================


// Update the preview whenever the user edits the question
editor.addEventListener('input', updatePreview);


/**
 * Handle mathmatical keyboards shortcuts.
 */
editor.addEventListener('keydown',  (event) => {

    // Ignore key combinations involving Command or Option.
    if (event.metaKey || event.altKey) {
        return;
    }

    // [1] Ctrl + Shift + M inserts display mathematics. 
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
        // Prevent the default browser behavior for this shortcut.
        event.preventDefault();
        insertMath(true);
    }
    // [2] Ctrl + M inserts inline mathematics.
    else if (event.ctrlKey && event.key.toLowerCase() === 'm') {
        // Prevent the default browser behavior for this shortcut.
        event.preventDefault();
        insertMath(false);
    } 
    

});
