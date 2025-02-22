import type { FC } from '../../lib/teact/teact';
import React, { memo } from '../../lib/teact/teact';

import type { MenuItemContextAction } from './ListItem';
import Menu from './Menu';
import MenuSeparator from './MenuSeparator';
import MenuItem from './MenuItem';
import useLastCallback from '../../hooks/useLastCallback';

type OwnProps = {
  contextActions: MenuItemContextAction[];
  contextMenuAnchor: { x: number; y: number };
  isContextMenuOpen: boolean;
  handleContextMenuClose: () => void;
  handleContextMenuHide: () => void;
  getTriggerElement: () => HTMLElement | null;
  getRootElement: () => HTMLElement | null;
};


const ContextMenu: FC<OwnProps> = ({
  contextActions,
  contextMenuAnchor,
  isContextMenuOpen,
  handleContextMenuClose,
  handleContextMenuHide,
  getTriggerElement,
  getRootElement
}) => {
  const getMenuElement = useLastCallback(
    () => document.querySelector('#portals')!.querySelector('.Tab-context-menu .bubble'),
  );
  const getLayout = useLastCallback(() => ({ withPortal: true }));

  return (
    <div
      className="ContextMenu"
    >
      <Menu
        isOpen={isContextMenuOpen}
        anchor={contextMenuAnchor}
        getTriggerElement={getTriggerElement}
        getRootElement={getRootElement}
        getMenuElement={getMenuElement}
        getLayout={getLayout}
        className="Tab-context-menu"
        autoClose
        onClose={handleContextMenuClose}
        onCloseAnimationEnd={handleContextMenuHide}
        withPortal
      >
        {contextActions.map((action) => (
          ('isSeparator' in action) ? (
            <MenuSeparator key={action.key || 'separator'} />
          ) : (
            <MenuItem
              key={action.title}
              icon={action.icon}
              destructive={action.destructive}
              disabled={!action.handler}
              onClick={action.handler}
            >
              {action.title}
            </MenuItem>
          )
        ))}
      </Menu>
    </div>
  );
};

export default memo(ContextMenu);





