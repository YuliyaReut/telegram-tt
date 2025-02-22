import type { FC } from '../../lib/teact/teact';
import React, { memo, useRef } from '../../lib/teact/teact';

import useOldLang from '../../hooks/useOldLang';

import './ActionBar.scss';
import { TabWithProperties } from './TabList';
import ActionBarItem from './ActionBarItem';

type OwnProps = {
  items: readonly TabWithProperties[];
  activeItem: number;
  onSwitchItem: (index: number) => void;
  contextRootElementSelector?: string;
};

const ActionBar: FC<OwnProps> = ({
  items,
  activeItem,
  onSwitchItem,
  contextRootElementSelector,
}) => {
  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);

  const lang = useOldLang();

  return (
    <div
      className="ActionBar"
      ref={containerRef}
      dir={lang.isRtl ? 'rtl' : undefined}
    >
      {items.map((item, i) => (
        <ActionBarItem
          item={item}
          isActiveItem={i === activeItem}
          isBlocked={item.isBlocked}
          badgeCount={item.badgeCount}
          isBadgeActive={item.isBadgeActive}
          contextRootElementSelector={contextRootElementSelector}
          onSwitchItem={() => item.id !== undefined && onSwitchItem(i)}
        />
      ))}
    </div>
  );
};

export default memo(ActionBar);
