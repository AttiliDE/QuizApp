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
// 2. Editor State
// =============================================================================

/*
 *  When true, the next display or aligned mathematical
 *  environment will be surrounded by \boxed{}
*/
let boxNextMath = false; 


// =============================================================================
// 3. Helper Functions
// =============================================================================

/**
 * Determines the appropriate prefix for display math based on the preceding text.
 * @param {string} textBefore - The text preceding the cursor.
 * @returns {string} The prefix to insert before display math.
 */
function getDisplayMathPrefix(textBefore) {
    // No spacing is necessary in an empty editor.

    if (textBefore.length === 0) {
        return '';
    }

    // Two or more existing newlines are sufficient spacing for display math.
    if (textBefore.endsWith('\n\n')) {
        return '';
    }

    // Add one newline if the text already ends with one.
    if (textBefore.endsWith('\n')) {
        return '\n';
    }

    // Otherwise, insert two newlines.
    return '\n\n';
}


/**
 * Returns the pending boxing option and resets it.
 * @returns {boolean} Whether the environment should be boxed.
 */
function consumeBoxOption() {
    const boxed = boxNextMath;
    boxNextMath = false;

    return boxed;
}


/**
 * Triggers the input event to update the live preview.
 */
function notifyEditorChanged() {
    editor.dispatchEvent(new Event('input', { bubbles: true }));
}


/**
 * 
 * @param {string} text - text to insert
 * @param {number} cursorOffset  - Cursor position within inserted text.
 */
function insertAtSelection(text, cursorOffset) {
    
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    // Replace the selected text.
    editor.setRangeText(text, start, end);

    // Position the cursor inside the inserted content.

    const cursorPosition = start + cursorOffset;

    editor.setSelectionRange(cursorPosition, cursorPosition);

    editor.focus();

    notifyEditorChanged();
}

// =============================================================================
// 4. MARKDOWN AND LATEX PREVIEW
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


// =============================================================================
// 5. MATHEMATICAL ENVIRONMENTS
// =============================================================================



/**
 * 
 * @param {boolean} display - Whether to use display math.
 * @param {boolean} boxed - Whether to box the expression.
 */
function insertMath(display = false, boxed = false) {

    // Identify the current selection
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    
    // Preserve any text selected by the user.
    const selectedText = editor.value.slice(start, end);
    const textBefore = editor.value.slice(0, start);

   

    // Boxing is supported only in display
    const useBox = display && boxed;


    // Construct the mathematical delimiters.
    const opening = display
        ? (useBox ? "$$\n\\boxed{" : "$$\n")
        : "$";

    const closing = display
        ? (useBox ? "}\n$$" : "\n$$")
        : "$";


    // Apply spacing before display mathematics
    const prefix = display ? getDisplayMathPrefix(textBefore) : '';

    const insertion = `${prefix}${opening}${selectedText}${closing}`;


    // Position the cursor inside the math environment.
    const cursorOffset = prefix.length + opening.length + selectedText.length;
    insertAtSelection(insertion, cursorOffset);
}



/**
 * 
 * @param {boolean} boxed - Whether to box the environment.
 */
function insertAlignedMath(boxed = false) {


    // Identify the current cursor position
    const start = editor.selectionStart;


    // Get the content preceding the cursor.
    const textBefore = editor.value.slice(0, start);

    // Apply the same rules as display mathematics
    const prefix = getDisplayMathPrefix(textBefore);

    // Define the LaTeX template, optionally wrapped in a box.

// Define the opening of the aligned environment.
const opening = boxed
    ? "$$\n\\boxed{\n\\begin{aligned}\n    "
    : "$$\n\\begin{aligned}\n    ";

    // Define the closing of the aligned environment.
    const closing = boxed
        ? "\n\\end{aligned}\n}\n$$"
        : "\n\\end{aligned}\n$$";

    // Initial equation row.
    const row = "&= ";

    // Combine the components.
    const insertion = prefix + opening + row + closing;

    // Place the cursor before the alignment marker.
    const cursorOffset = prefix.length + opening.length - 1;

    insertAtSelection(insertion, cursorOffset);

}


function insertAlignedRow() {

    // Get the current cursor position
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    // Get the text before and after the selection 
    const before = editor.value.slice(0, start);
    const after = editor.value.slice(end);

    // Find the most recent aligned environment markers.
    const opening = before.lastIndexOf('\\begin{aligned}');
    const previousClosing = before.lastIndexOf('\\end{aligned}');

    // Check whether the cursor is inside an aligned environment.
    const insideAligned = opening !== -1 && opening > previousClosing 
        && after.includes('\\end{aligned}');

    if (!insideAligned) {
        return;
    }

    // Create a line break and a new aligned equation row.
    const newRow = String.raw`\\ ` + '\n   &= ';

    // Insert the new row at the cursor.
    editor.setRangeText(newRow, start, end);

    // Place the cursor before the new alignment marker 
    const cursorPosition = start + newRow.indexOf('&=') - 1;
    
    editor.setSelectionRange(cursorPosition, cursorPosition);
    editor.focus();

    // Refresh the live preview.
    editor.dispatchEvent(new Event('input', { bubbles: true}));
}



/**
 * Moves the cursor ouside the current display
 * mathematical environment.
 */
function finishMathEnvironment() {

    // Get the cursor position.
    const cursor = editor.selectionStart;

    // Get the entire editor content
    const text = editor.value;


}
// =============================================================================
// 6. Event Listeners
// =============================================================================


// Update the preview whenever the user edits the question
editor.addEventListener('input', updatePreview);


/**
 * Handle mathmatical keyboards shortcuts.
 */
editor.addEventListener('keydown',  (event) => {
console.log({
    key: event.key,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey
});

    // [0] Option + B: Toggle boxing for the next environment.
    if (
        event.altKey && 
        !event.ctrlKey &&
        !event.metaKey && 
        !event.shiftKey &&
        event.code === 'KeyB'
    ) {
        event.preventDefault();

        boxNextMath = !boxNextMath;
        return;
    }

    // [2] Escape: Cancel pending boxing.

    if (event.key === 'Escape' && boxNextMath) {
        event.preventDefault();
        boxNextMath = false;
        return;
    }

    // ignore other combinations involving Option
    if (event.altKey) {
        return;
    }


    // [3] Ctrl + Shift + M inserts display mathematics. 
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyM') {
        // Prevent the default browser behavior for this shortcut.
        event.preventDefault();
        insertMath(true, consumeBoxOption());
    }
    // [4] Ctrl + M inserts inline mathematics.
    else if (event.ctrlKey && event.code === 'KeyM') {
        // Prevent the default browser behavior for this shortcut.
        event.preventDefault();
        insertMath(false);
    } 
    // [5] Ctrl + Shift + J: Aligned mathematics.
    else if (event.ctrlKey && event.shiftKey && event.code === 'KeyJ') {
        // Prevent the default browser behavior for this shortcut.
        event.preventDefault();
        insertAlignedMath(consumeBoxOption());
    }
    // [6] Ctrl + Enter: Insert a new aligned equation row.
    else if (event.metaKey && !event.shiftKey && !event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        insertAlignedRow();
    }

});

updatePreview();
