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
// 3. HELPER FUNCTIONS
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


function getDisplayMathSuffix(textAfter) {

    // Now additional spacing if two newlines already exist.
    if (textAfter.startsWith('\n\n')) {
        return '';
    }

    // Add one newline if one already exists.
    if (textAfter.startsWith('\n')) {
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

/**
 * Finds the display-math envinronmen containing the cursor
 * @returns {{ start: number, end: number } | null}
 * The environment range, or null if the cursor is outside.
 */
function getDisplayMathRange() {

    // Get the editor content and cursor position
    const text = editor.value;
    const cursor = editor.selectionStart;

    // count display delimiters preceding the cursor
    const before = text.slice(0, cursor);
    const delimiterCount = before.split('$$').length -1;

    // An even count means we are outside display math
    if (delimiterCount % 2 === 0) {
        return null;
    }

    // Find the opening delimiter.
    const start = text.lastIndexOf('$$', cursor -1);

    // Find the closing delimiter.
    const end = text.indexOf('$$', cursor);

    // An incomplete environment cannot be deleted safely.
    if (start === -1 || end === -1) {
        return null;
    }

    // Include two characters of the closing delimter.

    return { start: start, end: end + 2 };
}


/**
 * Deletes text between two character positions.
 * 
 * @param {number} start - Beginning of the range.
 * @param {number} end - End of the range (exclusive)
 */
function deleteRange(start, end) {

    // Replace the specified range with an empty string.
    editor.setRangeText('', start, end);

    // Position the cursor at the deletion point.
    editor.setSelectionRange(start, start);
    editor.focus();

    // Refresh the live preview.
    notifyEditorChanged();
}

/**
 * Determines the replacement text required when removing a display mathematical
 * environment.
 * 
 * @param {string} textBefore - Text before the environment.
 * @param {string} textAfter - Text after the environment.
 * @returns {string} - The appropriate spacing to insert.
 */
function getDeletionSpacing(textBefore, textAfter) {
    
    // If content exists on both sides, retain one blank line.
    if (textBefore.trim() && textAfter.trim()) {
        return '\n\n';
    }

    // Otherwise, no separating blank line is necessary.
    return '';
}

/**
 * Determines whether the cursor is inside an aligned environment
 * within the current display-math block.
 * 
 * @returns {boolean}
 */
function isInsideAligned() {

    const range = getDisplayMathRange();

    if (range === null) {
        return false;
    }

    const cursor = editor.selectionStart;
    const text = editor.value;

    // Find aligned markers within the current display block.
    const opening = text.indexOf('\\begin{aligned}', range.start);
    const closing = text.indexOf('\\end{aligned}', range.start);

    // Ensure both markers exist within the display block.
    if (opening === -1 || closing === -1 || closing >= range.end) {
        return false;
    }

    // cursor must be inside the alligned content.
    return cursor >= opening + '\\begin{aligned}'.length && cursor <= closing;
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
    const textAfter = editor.value.slice(end);
   

    // Boxing is supported only in display
    const useBox = display && boxed;


    // Construct the mathematical delimiters.
    const opening = display
        ? (useBox ? "$$\n\\boxed{\n  " : "$$\n  ")
        : "$";

    const closing = display
        ? (useBox ? "\n}\n$$" : "\n$$")
        : "$";


    // Apply spacing before and after display mathematics
    const prefix = display ? getDisplayMathPrefix(textBefore) : '';
    const suffix = display ? getDisplayMathSuffix(textAfter) : '';

    const insertion = `${prefix}${opening}${selectedText}${closing}${suffix}`;


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
    const end = editor.selectionEnd;

    // Get the content preceding the cursor.
    const textBefore = editor.value.slice(0, start);

    // Get the content following the cursor.
    const textAfter = editor.value.slice(end);

    // Apply the same rules as display mathematics
    const prefix = getDisplayMathPrefix(textBefore);
    const suffix = getDisplayMathSuffix(textAfter);

    // Define the LaTeX template, optionally wrapped in a box.

    // Define the opening of the aligned environment.
    const opening = boxed
        ? "$$\n\\boxed{\n\\begin{aligned}\n  "
        : "$$\n\\begin{aligned}\n  ";

    // Define the closing of the aligned environment.
    const closing = boxed
        ? "\n\\end{aligned}\n}\n$$\n\n"
        : "\n\\end{aligned}\n$$\n\n";

    // Initial equation row.
    const row = "&= ";

    // Combine the components.
    const insertion = prefix + opening + row + closing + suffix;

    // Place the cursor before the alignment marker.
    const cursorOffset = prefix.length + opening.length - 1;

    insertAtSelection(insertion, cursorOffset);

}

/**
 * Insert a new row inside a display environment.
 * 
 * - Display math: newline followed by two spaces .
 * - Aligned math: LaTex row separator followed by &=.
 * @returns {void}
 */
function insertMathRow() {

    // Get the current cursor position
    const start = editor.selectionStart;
    const end = editor.selectionEnd;


    // identify the current display-math environment
    // Get the text before and after the selection 
    const before = editor.value.slice(0, start);
    const delimiterCount = before.split('$$').length - 1; 

    // Do nothing if the cursor is outside display math.
    if (delimiterCount % 2 === 0) {
        return;
    }

    // Determine whether the cursor is inside an aligned environment.
    const alignedStart = before.lastIndexOf('\\begin{aligned}');
    const alignedEnd = before.lastIndexOf('\\end{aligned}');

    const insideAligned = alignedStart !== -1 && alignedStart > alignedEnd;

    // Choose the row structure
    const newRow = insideAligned ? String.raw` \\` + '\n  &= ': String.raw` \\` +'\n  ';
   
    
    // Determine where the cursor should be placed
    const cursorOffset = insideAligned ? newRow.indexOf('&=') -1 : newRow.length;

    // insert the row and update the editor 
    insertAtSelection(newRow, cursorOffset);
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

    // Find the last display-math delimiter before the cursor.
    const lastDelimiter = text.lastIndexOf('$$', cursor - 1);

    // Find the next display-math delimiter after the cursor.
    const nextDelimiter = text.indexOf('$$', cursor);

    // Stop if no surrounding delimiters exist.
    if (lastDelimiter === -1 || nextDelimiter === -1) {
        return;
    }

    // Count display-math delimiters before the cursor.
    const delimitersBefore = text.slice(0, cursor).split('$$').length - 1;

    // An odd count indicates that we are inside display math.
    const insideDisplayMath = delimitersBefore % 2 === 1;

    if (!insideDisplayMath) {
        return;
    }

    // Move the cursor immediately after the closing delimiter.
    const newCursor = nextDelimiter + 4; // 4 accounts for the break in lines 
    
    editor.setSelectionRange(newCursor, newCursor);
    editor.focus();

}

/**
 * Deletes the display-math environment containing the cursor.
 * while preserving paragraph separation. 
 */
function deleteMathEnvironment() {

    // identify the current mathematical environment
    const range = getDisplayMathRange();

    // Do nothing if the cursor is outside display math.
    if (range == null) {
        return;
    }

    const text = editor.value;

    // Extend the deletion range over adjacent newlines.
    let start = range.start;
    let end = range.end;

    while (start > 0 && text[start - 1] === '\n') {
        start--;
    }

    while (end < text.length && text[end] === '\n') {
        end++;
    }

    // Determine the surrounding content.
    const textBefore = text.slice(0, start);
    const textAfter = text.slice(end);

    // Preserve separation between remaining paragraphs
    const replacement = getDeletionSpacing(textBefore, textAfter);

    // Replace the entire range with the appropriate spacing.
    editor.setRangeText(replacement, start, end); 

    // Position the cursor after the replacement.
    const cursor = start + replacement.length;

    editor.setSelectionRange(cursor, cursor);
    editor.focus();

    notifyEditorChanged();

}

/**
 * Deletes the mathematical row containing the cursor.
 * 
 * Supports display, aligned, boxed display and boxed aligned math.
 * If only one row remains, deletes the environment.
 */
function deleteMathRow() {

    // Identify teh display environment containing the cursor.
    const range = getDisplayMathRange();

    if (range === null) {
        return;
    }

    const text = editor.value;
    const cursor = editor.selectionStart;

    // [1] Determine the content boundaries

    // Exclude the opening and closing $$ delimiters.
    const openingLineEnd = text.indexOf('\n', range.start + 2);
    const closingStart = range.end - 2;

    if (openingLineEnd === -1) {
        return;
    }

    let contentStart = openingLineEnd + 1;
    let contentEnd = text.lastIndexOf('\n', closingStart - 1);
    
    // Detect an aligned environment within this display block. 
    const alignedStart = text.indexOf('\\begin{aligned}', contentStart);
    const alignedEnd = text.indexOf('\\end{aligned}', contentStart);

    const isAligned = 
        alignedStart !== -1 && 
        alignedEnd !== -1 &&
        alignedEnd < closingStart;

    if (isAligned) {

        // Skip the opening \begin{aligned} line.
        const lineEnd = text.indexOf('\n', alignedStart);

        if (lineEnd === -1) {
            return;
        }

        contentStart = lineEnd + 1; 

        // Exclude the closing \end{aligned} line.
        contentEnd = text.lastIndexOf('\n', alignedEnd);
    } else {

        // Detect a boxed display environment.
        const boxStart = text.indexOf(
            '\\boxed{', contentStart
        );

        if (boxStart !== -1 && boxStart < contentEnd) {

            const lineEnd = text.indexOf('\n', boxStart);
            const boxClose = text.lastIndexOf('\n}', closingStart);

            if (lineEnd === -1 || boxClose === -1) {
                return;
            }

            contentStart = lineEnd + 1;
            contentEnd = boxClose;
        }
    }

    if (
        contentEnd <= contentStart ||
        cursor < contentStart ||
        cursor > contentEnd
    ) {
        return;
    }

    // [2] Identify mathematical rows 

    const content = text.slice(contentStart, contentEnd);

    // math latex row separators followed by a source newline.
    const separator = /\\\\[ \t]*\n/g;

    const rows = [];
    let rowStart = contentStart;
    let match;

    while ((match = separator.exec(content)) !== null) {

        const separatorStart = contentStart + match.index;
        const nextRowStart = separatorStart + match[0].length;

        rows.push({
            start: rowStart,
            end: separatorStart,
            separatorStart: separatorStart,
            nextStart: nextRowStart
        });

        rowStart = nextRowStart;
    }

    // Include the final row 
    rows.push({ start: rowStart, end: contentEnd });

    // One row means the whole environment must be deleted. 
    if (rows.length === 1) {
        deleteMathEnvironment();
        return;
    }

    // [3] Find the current row 
    const rowIndex = rows.findIndex(row => cursor >= row.start && cursor <= row.end);
    if (rowIndex === -1) {
        return;
    }

    // [4] Delete the current row 
    let deleteStart;
    let deleteEnd; 

    if (rowIndex < rows.length - 1) {

        // Delete the current row and its following separator.
        deleteStart = rows[rowIndex].start;
        deleteEnd = rows[rowIndex].nextStart;

    } else {

        // Last row: delete its preceding separator too.
        deleteStart = rows[rowIndex - 1].nextStart;
        deleteEnd = rows[rowIndex].end;

    }
    

    // Delete the selected mathematical row
    deleteRange(deleteStart, deleteEnd);
    

    // Identify the line at the new cursor position 
    const lineStart = editor.value.lastIndexOf('\n', editor.selectionStart -1) + 1;

    const nextNewLine = editor.value.indexOf('\n', lineStart);
    
    // Extract the remaining line. 
    const lineEnd = nextNewLine === -1 ? editor.value.length : nextNewLine;
    const line = editor.value.slice(lineStart, lineEnd);

    // Find the first non-whitespace character.
    const firstCharacter = line.search(/\S/);

    // Move the cursor only if the line contains text.
    if (firstCharacter !== -1) {
        const cursorPosition = lineStart + firstCharacter;

        editor.setSelectionRange(cursorPosition, cursorPosition);
    }
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


// Temporary debugging shortcut: Ctrl + Shift + D.



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


    // [3] Cmd + Option + Enter: Finish the current "display" math environment.
    else if (
        event.metaKey && 
        event.altKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        event.key === 'Enter'
    ) {
        event.preventDefault();
        finishMathEnvironment();
    }
    else if (
        event.metaKey &&
        event.altKey &&
        !event.ctrlKey &&
        !event.shiftKey && 
        event.key === 'Backspace'
    ) {
        event.preventDefault();
        deleteMathRow();
    }


    // [4] ignore other combinations involving Option
    if (event.altKey) {
        return;
    }


    // [5] Ctrl + Shift + M inserts display mathematics. 
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyM') {
        // Prevent the default browser behavior for this shortcut.
        event.preventDefault();
        insertMath(true, consumeBoxOption());
    }
    // [6] Ctrl + M inserts inline mathematics.
    else if (event.ctrlKey && event.code === 'KeyM') {
        // Prevent the default browser behavior for this shortcut.
        event.preventDefault();
        insertMath(false);
    } 
    // [7] Ctrl + Shift + J: Aligned mathematics.
    else if (event.ctrlKey && event.shiftKey && event.code === 'KeyJ') {
        // Prevent the default browser behavior for this shortcut.
        event.preventDefault();
        insertAlignedMath(consumeBoxOption());
    }
    // [8] Cmd + Enter: Insert a new aligned equation row.
    else if (event.metaKey && !event.shiftKey && !event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        insertMathRow();
    }


});

updatePreview();
