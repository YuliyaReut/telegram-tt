import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useMemo
} from '../../../lib/teact/teact';

import { LeftColumnContent } from '../../../types';

import { APP_NAME, DEBUG, IS_BETA } from '../../../config';
import buildClassName from '../../../util/buildClassName';
import { IS_ELECTRON, IS_MAC_OS } from '../../../util/windowEnvironment';

import useOldLang from '../../../hooks/useOldLang';

import Button from '../../ui/Button';

import './LeftMain.scss';
import DropdownMenu from '../../ui/DropdownMenu';
import LeftSideMenuItems from './LeftSideMenuItems';
import useAppLayout from '../../../hooks/useAppLayout';
import useLeftHeaderButtonRtlForumTransition from './hooks/useLeftHeaderButtonRtlForumTransition';
import useFlag from '../../../hooks/useFlag';
import { useFullscreenStatus } from '../../../hooks/window/useFullscreen';

import './MainButton.scss';

type OwnProps = {
  shouldHideSearch?: boolean;
  content: LeftColumnContent;
  shouldSkipTransition?: boolean;
  onSelectSettings: NoneToVoidFunction;
  onSelectContacts: NoneToVoidFunction;
  onSelectArchived: NoneToVoidFunction;
  onReset: NoneToVoidFunction;
};

const MainButton: FC<OwnProps> = ({
  shouldHideSearch,
  content,
  shouldSkipTransition,
  onSelectSettings,
  onSelectContacts,
  onSelectArchived,
  onReset
}) => {
  const hasMenu = content === LeftColumnContent.ChatList;
  const { isMobile, isDesktop } = useAppLayout();
  const oldLang = useOldLang();
  const versionString = IS_BETA ? `${APP_VERSION} Beta (${APP_REVISION})` : (DEBUG ? APP_REVISION : APP_VERSION);
  const [isBotMenuOpen, markBotMenuOpen, unmarkBotMenuOpen] = useFlag();
  const isFullscreen = useFullscreenStatus();

  // Disable dropdown menu RTL animation for resize
  const {
    shouldDisableDropdownMenuTransitionRef,
    handleDropdownMenuTransitionEnd,
  } = useLeftHeaderButtonRtlForumTransition(shouldHideSearch);

  const MainButton: FC<{ onTrigger: () => void; isOpen?: boolean }> = useMemo(() => {
      return ({ onTrigger, isOpen }) => (
        <Button
          round
          ripple={hasMenu && !isMobile}
          size="smaller"
          color="translucent"
          className={'main-button'}
          // eslint-disable-next-line react/jsx-no-bind
          onClick={hasMenu ? onTrigger : () => onReset()}
          ariaLabel={hasMenu ? oldLang('AccDescrOpenMenu2') : 'Return to chat list'}
        >
          <div className={buildClassName(
            'animated-menu-icon',
            !hasMenu && 'state-back',
            shouldSkipTransition && 'no-animation',
          )}
          />
        </Button>
      );
    }, [hasMenu, isMobile, oldLang, onReset, shouldSkipTransition]);

  return (
    <div id="MainButton">
      <DropdownMenu
        trigger={MainButton}
        footer={`${APP_NAME} ${versionString}`}
        className={buildClassName(
          'main-menu',
          oldLang.isRtl && 'rtl',
          shouldHideSearch && oldLang.isRtl && 'right-aligned',
          shouldDisableDropdownMenuTransitionRef.current && oldLang.isRtl && 'disable-transition',
        )}
        forceOpen={isBotMenuOpen}
        positionX={shouldHideSearch && oldLang.isRtl ? 'right' : 'left'}
        transformOriginX={IS_ELECTRON && IS_MAC_OS && !isFullscreen ? 90 : undefined}
        onTransitionEnd={oldLang.isRtl ? handleDropdownMenuTransitionEnd : undefined}
      >
        <LeftSideMenuItems
          onSelectArchived={onSelectArchived}
          onSelectContacts={onSelectContacts}
          onSelectSettings={onSelectSettings}
          onBotMenuOpened={markBotMenuOpen}
          onBotMenuClosed={unmarkBotMenuOpen}
        />
      </DropdownMenu>
    </div>

  );
};

export default memo(MainButton);
