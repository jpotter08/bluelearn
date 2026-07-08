import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createHeadingNode, HeadingNode } from "@lexical/rich-text";
import { lexical } from "@mdxeditor/editor";

interface H1RestrictionListenerProps {
  onH1Attempted: () => void;
}

export default function H1RestrictionListener({
  onH1Attempted,
}: H1RestrictionListenerProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const { $getSelection, $isRangeSelection, $getNodeByKey, $isTextNode } =
      lexical;

    // 1. Listen for new or updated HeadingNodes to intercept pasted H1s
    const removeMutationListener = editor.registerMutationListener(
      HeadingNode,
      (mutatedNodes) => {
        for (const [nodeKey, mutation] of mutatedNodes) {
          if (mutation === "created" || mutation === "updated") {
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if (
                node instanceof HeadingNode &&
                (node.getTag() as string) === "h1"
              ) {
                node.setTag("h2");
                onH1Attempted();
              }
            });
          }
        }
      }
    );

    // 2. Intercept typed Markdown H1 shortcuts: '# ' at the beginning of a line
    const removeUpdateListener = editor.registerUpdateListener(
      ({ tags, dirtyLeaves, editorState }) => {
        // Skip updates coming from history undo/redo or collaboration to prevent loops
        if (
          tags.has("collaboration") ||
          tags.has("historic") ||
          editor.isComposing()
        ) {
          return;
        }

        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;

          const anchorKey = selection.anchor.key;
          const anchorOffset = selection.anchor.offset;
          const anchorNode = $getNodeByKey(anchorKey);

          if (!$isTextNode(anchorNode) || !dirtyLeaves.has(anchorKey)) return;

          // Skip processing inside code blocks or other specialized containers
          const parentNode = anchorNode.getParent();
          if (parentNode === null || parentNode.getType() === "code") return;

          const textContent = anchorNode.getTextContent();
          const textBeforeCursor = textContent.slice(0, anchorOffset);

          // If the user typed '# ' at the very start of a paragraph
          if (textBeforeCursor === "# ") {
            editor.update(() => {
              if (parentNode.getType() === "paragraph") {
                const headingNode = $createHeadingNode("h2");

                if (textContent === "# ") {
                  // Paragraph is empty other than the shortcut.
                  // Create a new text node, append it to the heading, and select it.
                  const textNode = lexical.$createTextNode("");
                  headingNode.append(textNode);
                  parentNode.replace(headingNode);
                  textNode.select();
                } else {
                  // Paragraph has other content. Strip '# ' and keep existing children.
                  anchorNode.setTextContent(textContent.slice(2));
                  parentNode.getChildren().forEach((child) => {
                    headingNode.append(child);
                  });
                  parentNode.replace(headingNode);

                  // Safely select the heading node at its start
                  headingNode.select(0, 0);
                }
              }
            });
            onH1Attempted();
          }
        });
      }
    );

    // Unsubscribe both listeners on unmount
    return () => {
      removeMutationListener();
      removeUpdateListener();
    };
  }, [editor, onH1Attempted]);

  return null;
}
