import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useEffect, useRef, useState,
} from '../../../lib/teact/teact';

import type { IAnchorPosition } from '../../../types';
import { NodeFormat } from './hooks/useTextEditorState';

import buildClassName from '../../../util/buildClassName';
import captureEscKeyListener from '../../../util/captureEscKeyListener';
import getKeyFromEvent from '../../../util/getKeyFromEvent';
import stopEvent from '../../../util/stopEvent';

import useFlag from '../../../hooks/useFlag';
import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';
import useShowTransitionDeprecated from '../../../hooks/useShowTransitionDeprecated';
import useVirtualBackdrop from '../../../hooks/useVirtualBackdrop';

import Icon from '../../common/icons/Icon';
import Button from '../../ui/Button';

import './TextFormatter.scss';
import { ensureProtocol } from '../../../util/ensureProtocol';
import { EDITABLE_INPUT_ID } from '../../../config';

export type OwnProps = {
  isOpen: boolean;
  anchorPosition?: IAnchorPosition;
  selectedRange?: Range;
  setSelectedRange: (range: Range) => void;
  onClose: () => void;
  onFormat: (format: NodeFormat, data?: Record<string, any>) => void;
};

interface ISelectedTextFormats {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  monospace?: boolean;
  spoiler?: boolean;
  link?: boolean;
}

const TEXT_FORMAT_BY_TAG_NAME: Record<string, keyof ISelectedTextFormats> = {
  B: 'bold',
  STRONG: 'bold',
  I: 'italic',
  EM: 'italic',
  U: 'underline',
  DEL: 'strikethrough',
  CODE: 'monospace',
  SPAN: 'spoiler',
};

const TextFormatter: FC<OwnProps> = ({
  isOpen,
  anchorPosition,
  selectedRange,
  onClose,
  onFormat
}) => {
  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const linkUrlInputRef = useRef<HTMLInputElement>(null);
  const { shouldRender, transitionClassNames } = useShowTransitionDeprecated(isOpen);
  const [isLinkControlOpen, openLinkControl, closeLinkControl] = useFlag();
  const [linkUrl, setLinkUrl] = useState('');
  const [inputClassName, setInputClassName] = useState<string | undefined>();

  useEffect(() => (isOpen ? captureEscKeyListener(onClose) : undefined), [isOpen, onClose]);
  useVirtualBackdrop(
    isOpen,
    containerRef,
    onClose,
    true,
  );

  useEffect(() => {
    if (isLinkControlOpen) {
      linkUrlInputRef.current!.focus();
    } else {
      setLinkUrl('');
    }
  }, [isLinkControlOpen]);

  useEffect(() => {
    if (!shouldRender) {
      closeLinkControl();
      setInputClassName(undefined);
    }
  }, [closeLinkControl, shouldRender]);

  useEffect(() => {
    if (!isOpen || !selectedRange) {
      return;
    }

    const selectedFormats: ISelectedTextFormats = {};
    let { parentElement } = selectedRange.commonAncestorContainer;
    while (parentElement && parentElement.id !== EDITABLE_INPUT_ID) {
      const textFormat = TEXT_FORMAT_BY_TAG_NAME[parentElement.tagName];
      if (textFormat) {
        selectedFormats[textFormat] = true;
      }

      parentElement = parentElement.parentElement;
    }

  }, [isOpen, selectedRange, openLinkControl]);


  function updateInputStyles() {
    const input = linkUrlInputRef.current;
    if (!input) {
      return;
    }

    const { offsetWidth, scrollWidth, scrollLeft } = input;
    if (scrollWidth <= offsetWidth) {
      setInputClassName(undefined);
      return;
    }

    let className = '';
    if (scrollLeft < scrollWidth - offsetWidth) {
      className = 'mask-right';
    }
    if (scrollLeft > 0) {
      className += ' mask-left';
    }

    setInputClassName(className);
  }

  function handleLinkUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLinkUrl(e.target.value);
    updateInputStyles();
  }

  const handleFormatting = useLastCallback((format: NodeFormat) => {
    if (format === 'link') {

      const formattedLinkUrl = (ensureProtocol(linkUrl) || '').split('%').map(encodeURI).join('%');
      onFormat(format, { url: formattedLinkUrl});
    } else {
      onFormat(format);
    }

    onClose();
  });

  const handleKeyDown = useLastCallback((e: KeyboardEvent) => {
    const HANDLERS_BY_KEY: Record<string, AnyToVoidFunction> = {
      k: openLinkControl,
      b: () => handleFormatting('bold'),
      u: () => handleFormatting('underline'),
      i: () => handleFormatting('italic'),
      m: () => handleFormatting('monospace'),
      s: () => handleFormatting('strikethrough'),
      p: () => handleFormatting('spoiler'),
    };

    const handler = HANDLERS_BY_KEY[getKeyFromEvent(e)];

    if (
      e.altKey
      || !(e.ctrlKey || e.metaKey)
      || !handler
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    handler();
  });

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const lang = useOldLang();

  function handleContainerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && isLinkControlOpen) {
      handleFormatting('link');
      e.preventDefault();
    }
  }

  if (!shouldRender) {
    return undefined;
  }

  const className = buildClassName(
    'TextFormatter',
    transitionClassNames,
    isLinkControlOpen && 'link-control-shown',
  );

  const linkUrlConfirmClassName = buildClassName(
    'TextFormatter-link-url-confirm',
    Boolean(linkUrl.length) && 'shown',
  );

  const style = anchorPosition
    ? `left: ${anchorPosition.x}px; top: ${anchorPosition.y}px;--text-formatter-left: ${anchorPosition.x}px;`
    : '';

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      onKeyDown={handleContainerKeyDown}
      // Prevents focus loss when clicking on the toolbar
      onMouseDown={stopEvent}
    >
      <div className="TextFormatter-buttons">
        <Button
          color="translucent"
          ariaLabel="Spoiler text"
          onClick={() => handleFormatting('spoiler')}
        >
          <Icon name="eye-closed" />
        </Button>
        <div className="TextFormatter-divider" />
        <Button
          color="translucent"
          ariaLabel="Bold text"
          onClick={() => handleFormatting('bold')}
        >
          <Icon name="bold" />
        </Button>
        <Button
          color="translucent"
          ariaLabel="Italic text"
          onClick={() => handleFormatting('italic')}
        >
          <Icon name="italic" />
        </Button>
        <Button
          color="translucent"
          ariaLabel="Underlined text"
          onClick={() => handleFormatting('underline')}
        >
          <Icon name="underlined" />
        </Button>
        <Button
          color="translucent"
          ariaLabel="Strikethrough text"
          onClick={() => handleFormatting('strikethrough')}
        >
          <Icon name="strikethrough" />
        </Button>
        <Button
          color="translucent"
          ariaLabel="Monospace text"
          onClick={() => handleFormatting('monospace')}
        >
          <Icon name="monospace" />
        </Button>
        <div className="TextFormatter-divider" />
        <Button color="translucent" ariaLabel={lang('TextFormat.AddLinkTitle')} onClick={openLinkControl}>
          <Icon name="link" />
        </Button>
      </div>

      <div className="TextFormatter-link-control">
        <div className="TextFormatter-buttons">
          <Button color="translucent" ariaLabel={lang('Cancel')} onClick={closeLinkControl}>
            <Icon name="arrow-left" />
          </Button>
          <div className="TextFormatter-divider" />

          <div
            className={buildClassName('TextFormatter-link-url-input-wrapper', inputClassName)}
          >
            <input
              ref={linkUrlInputRef}
              className="TextFormatter-link-url-input"
              type="text"
              value={linkUrl}
              placeholder="Enter URL..."
              autoComplete="off"
              inputMode="url"
              dir="auto"
              onChange={handleLinkUrlChange}
              onScroll={updateInputStyles}
            />
          </div>

          <div className={linkUrlConfirmClassName}>
            <div className="TextFormatter-divider" />
            <Button
              color="translucent"
              ariaLabel={lang('Save')}
              className="color-primary"
              onClick={() => handleFormatting('link')}
            >
              <Icon name="check" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(TextFormatter);
