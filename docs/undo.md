# Adding undo/redo to `bililiteRange`

bililiteRange.undo.js adds three methods to `bililiteRange`. It uses my [History](https://github.com/dwachss/historystack)
to maintain a record of changes to the text of the element. This means that only the text is restored with undo/redo;
markup is lost. It works by adding an input event listener that records the diff between the old text and the
new text, so if the text changes without sending an input event, the undo stack will be corrupted.

## `initUndo (attachKeys = true)`

Sets up the history stack and creates the input event listeners. Will only run once per element 
(creates `range.data.undos` for the stack and checks for the existence of that). If `attachKeys` is true,
also sets up `keydown` event listeners for control-Z and control-Y and attaches them to `undo` and `redo`.

Undo and redo input events are not put on the undo stack (undo then undo does two levels of undo; the second undo
does not undo the first one. That would be a redo). Keydown input events (`eventType` == `insertText` and a single
character is inserted without deleting text, and that inserts right after the previous insertion) add up,
so a string of typing will be undone in a single call. 

## `undo(select = true)`

Restores the text to what it was prior to the last input event. The bounds are set to the end of the restored text,
and, if `select` is true, the selection point is set there.

## `redo(select = true)`

Undoes the last undo, and so on back up the stack.

If there is no state to undo/redo to, the text is silently left unchanged.