(function () {
  const styleId = "cursor-rtl-chat-fix-style";

  function removeExistingStyle() {
    const existing = document.getElementById(styleId);
    if (existing) {
      existing.remove();
    }
  }

  function injectStyle() {
    removeExistingStyle();

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .markdown-root,
      .anysphere-markdown-container-root,
      .markdown-section,
      .composer-message-group,
      [data-message-kind="assistant"] .markdown-root,
      .space-y-4,
      .composer-human-message,
      .composer-human-message-container,
      .human-message-with-todos-wrapper,
      .aislash-editor-input,
      .aislash-editor-input-readonly,
      .todo-list-container,
      .ui-todo-list,
      .ui-todo-item,
      .ui-todo-item__label,
      .ui-todo-item__content,
      .composer-questionnaire-toolbar,
      .composer-questionnaire-toolbar-header,
      .composer-questionnaire-toolbar-question-label,
      .composer-questionnaire-toolbar-option,
      .composer-questionnaire-toolbar-freeform-input,
      .composer-questionnaire-toolbar-actions,
      .ui-step-group-header,
      .ui-collapsible-header,
      .composer-tool-former-message,
      .tool-summary-hover-target,
      .truncate-one-line,
      .composer-pane-controls-feedback {
        direction: rtl !important;
        text-align: right !important;
        unicode-bidi: plaintext !important;
      }

      .aislash-editor-placeholder,
      [data-placeholder] {
        direction: rtl !important;
        text-align: right !important;
        right: 15px !important;
        left: auto !important;
      }

      .markdown-root ul,
      .markdown-root ol,
      .markdown-section ul,
      .markdown-section ol,
      .list-disc,
      .list-inside,
      [data-streamdown="unordered-list"],
      [data-streamdown="ordered-list"],
      .todo-list,
      .todo-label,
      .todo-content {
        padding-right: 20px !important;
        padding-left: 0 !important;
        direction: rtl !important;
        text-align: right !important;
      }

      .ui-todo-item {
        display: flex !important;
        align-items: flex-start !important;
      }

      .ui-todo-item__indicator,
      .todo-indicator-container {
        margin-left: 8px !important;
        margin-right: 0 !important;
      }

      .composer-questionnaire-toolbar-option-label {
        margin-right: 8px !important;
        margin-left: 0 !important;
      }

      .markdown-table-container {
        direction: ltr !important;
        overflow-x: auto !important;
        max-width: 100% !important;
        display: block !important;
      }

      table.markdown-table {
        direction: rtl !important;
        width: max-content !important;
        min-width: 100% !important;
        border-collapse: collapse !important;
      }

      .markdown-table th,
      .markdown-table td {
        text-align: right !important;
      }

      code,
      pre,
      .markdown-code-outer-container,
      .cursor-code-block-content,
      .composer-code-block-content,
      .monaco-editor,
      .ui-code-block,
      .ui-default-code,
      .composer-message-codeblock,
      .xterm,
      .terminal {
        direction: ltr !important;
        text-align: left !important;
        unicode-bidi: isolate !important;
      }

      .markdown-root code,
      .markdown-section code {
        display: inline-block;
        direction: ltr !important;
        unicode-bidi: isolate !important;
      }
    `;

    document.head.appendChild(style);
  }

  injectStyle();
})();
