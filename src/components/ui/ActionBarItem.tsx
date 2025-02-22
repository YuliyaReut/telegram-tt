import type { FC } from '../../lib/teact/teact';
import React, { memo, useRef } from '../../lib/teact/teact';

import { MouseButton } from '../../util/windowEnvironment';

import './ActionBar.scss';
import { TabWithProperties } from './TabList';
import { getIconPathByEmoji } from '../../util/getChatIconPathByEmoji';
import Icon from '../common/icons/Icon';
import buildClassName from '../../util/buildClassName';
import useContextMenuHandlers from '../../hooks/useContextMenuHandlers';
import ContextMenu from './ContextMenu';
import useLastCallback from '../../hooks/useLastCallback';
import { useFastClick } from '../../hooks/useFastClick';

import './ActionBarItem.scss';

type OwnProps = {
  item: TabWithProperties;
  isActiveItem: boolean;
  isActive?: boolean;
  isBlocked?: boolean;
  badgeCount?: number;
  isBadgeActive?: boolean;
  onSwitchItem: () => void;
  contextRootElementSelector?: string;
};

const classNames = {
  active: 'Tab--active',
  badgeActive: 'Tab__badge--active',
};

const ActionBarItem: FC<OwnProps> = ({
  item,
  isActiveItem,
  badgeCount,
  isBadgeActive,
  onSwitchItem,
  contextRootElementSelector,
}) => {
  // eslint-disable-next-line no-null/no-null
  const itemRef = useRef<HTMLButtonElement>(null);

  const {
    contextMenuAnchor, handleContextMenu, handleBeforeContextMenu, handleContextMenuClose,
    handleContextMenuHide, isContextMenuOpen,
  } = useContextMenuHandlers(itemRef, !item.contextActions);

  const getTriggerElement = useLastCallback(() => itemRef.current);
    const getRootElement = useLastCallback(
      () => (contextRootElementSelector ? itemRef.current!.closest(contextRootElementSelector) : document.body),
    );


  const { handleClick, handleMouseDown } = useFastClick((e: React.MouseEvent<HTMLButtonElement>) => {
      if (item.contextActions && (e.button === MouseButton.Secondary || !onSwitchItem)) {
        handleBeforeContextMenu(e);
      }

      if (e.type === 'mousedown' && e.button !== MouseButton.Main) {
        return;
      }

      onSwitchItem?.();
    });

  return (
    <div
      className="ActionBarItem"
    >
        <button
          className={buildClassName(isActiveItem ? 'selected' : undefined, 'action-button')}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onContextMenu={handleContextMenu}
          ref={itemRef}>
          {Boolean(badgeCount) && (
            <span className={buildClassName('badge', isBadgeActive && classNames.badgeActive)}>{badgeCount}</span>
          )}
          <Icon name={getIconPathByEmoji(item.emoticon)} className='icon'/>
          <span className="title">
            {item.title}
          </span>

          {item.contextActions && contextMenuAnchor !== undefined &&
           <ContextMenu
              contextActions={item.contextActions}
              contextMenuAnchor={contextMenuAnchor}
              isContextMenuOpen={isContextMenuOpen}
              handleContextMenuClose={handleContextMenuClose}
              handleContextMenuHide={handleContextMenuHide}
              getTriggerElement={getTriggerElement}
              getRootElement={getRootElement}
            />
          }
        </button>
    </div>
  );
};

export default memo(ActionBarItem);
