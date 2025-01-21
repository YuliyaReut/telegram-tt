import type { FC } from '../../../lib/teact/teact';
import React, { memo, useRef } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiMessage, ApiTypeStory } from '../../../api/types';
import type { ObserveFn } from '../../../hooks/useIntersectionObserver';
import { AudioOrigin, type ISettings } from '../../../types';

import { getMessageWebPage } from '../../../global/helpers';
import { selectCanPlayAnimatedEmojis } from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';
import trimText from '../../../util/trimText';
import { getGiftAttributes, getStickerFromGift } from '../../common/helpers/gifts';
import renderText from '../../common/helpers/renderText';
import { calculateMediaDimensions } from './helpers/mediaDimensions';
import { getWebpageButtonLangKey } from './helpers/webpageType';

import useDynamicColorListener from '../../../hooks/stickers/useDynamicColorListener';
import useAppLayout from '../../../hooks/useAppLayout';
import useEnsureStory from '../../../hooks/useEnsureStory';
import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';

import Audio from '../../common/Audio';
import Document from '../../common/Document';
import EmojiIconBackground from '../../common/embedded/EmojiIconBackground';
import PeerColorWrapper from '../../common/PeerColorWrapper';
import RadialPatternBackground from '../../common/profile/RadialPatternBackground';
import SafeLink from '../../common/SafeLink';
import StickerView from '../../common/StickerView';
import Button from '../../ui/Button';
import BaseStory from './BaseStory';
import Photo from './Photo';
import Video from './Video';

import './WebPage.scss';

const MAX_TEXT_LENGTH = 170; // symbols
const WEBPAGE_STORY_TYPE = 'telegram_story';
const WEBPAGE_GIFT_TYPE = 'telegram_nft';
const STICKER_SIZE = 80;
const EMOJI_SIZE = 38;

type OwnProps = {
  message: ApiMessage;
  observeIntersectionForLoading?: ObserveFn;
  observeIntersectionForPlaying?: ObserveFn;
  noAvatars?: boolean;
  canAutoLoad?: boolean;
  canAutoPlay?: boolean;
  inPreview?: boolean;
  asForwarded?: boolean;
  isDownloading?: boolean;
  isProtected?: boolean;
  isConnected?: boolean;
  backgroundEmojiId?: string;
  theme: ISettings['theme'];
  story?: ApiTypeStory;
  shouldWarnAboutSvg?: boolean;
  autoLoadFileMaxSizeMb?: number;
  onAudioPlay?: NoneToVoidFunction;
  onMediaClick?: NoneToVoidFunction;
  onCancelMediaTransfer?: NoneToVoidFunction;
  onContainerClick?: ((e: React.MouseEvent) => void);
  isEditing?: boolean;
};
type StateProps = {
  canPlayAnimatedEmojis: boolean;
};
const STAR_GIFT_STICKER_SIZE = 120;

const WebPage: FC<OwnProps & StateProps> = ({
  message,
  observeIntersectionForLoading,
  observeIntersectionForPlaying,
  noAvatars,
  canAutoLoad,
  canAutoPlay,
  inPreview,
  asForwarded,
  isDownloading = false,
  isProtected,
  isConnected,
  story,
  theme,
  backgroundEmojiId,
  shouldWarnAboutSvg,
  autoLoadFileMaxSizeMb,
  onMediaClick,
  onContainerClick,
  onAudioPlay,
  onCancelMediaTransfer,
  isEditing,
}) => {
  const { openUrl, openTelegramLink } = getActions();
  const webPage = getMessageWebPage(message);
  const { isMobile } = useAppLayout();
  // eslint-disable-next-line no-null/no-null
  const stickersRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const giftStickersRef = useRef<HTMLDivElement>(null);

  const oldLang = useOldLang();
  const lang = useLang();

  const handleMediaClick = useLastCallback(() => {
    onMediaClick!();
  });

  const handleContainerClick = useLastCallback((e: React.MouseEvent) => {
    onContainerClick?.(e);
  });

  const handleOpenTelegramLink = useLastCallback(() => {
    if (!webPage) return;

    openTelegramLink({
      url: webPage.url,
    });
  });

  const { story: storyData, stickers } = webPage || {};

  useEnsureStory(storyData?.peerId, storyData?.id, story);

  const hasCustomColor = stickers?.isWithTextColor || stickers?.documents?.[0]?.shouldUseTextColor;
  const customColor = useDynamicColorListener(stickersRef, !hasCustomColor);

  if (!webPage) {
    return undefined;
  }

  const {
    siteName,
    url,
    displayUrl,
    title,
    description,
    photo,
    video,
    audio,
    type,
    document,
    mediaSize,
  } = webPage;
  const isStory = type === WEBPAGE_STORY_TYPE;
  const isGift = type === WEBPAGE_GIFT_TYPE;
  const isExpiredStory = story && 'isDeleted' in story;
  const quickButtonLangKey = !inPreview && !isExpiredStory ? getWebpageButtonLangKey(type) : undefined;
  const quickButtonTitle = quickButtonLangKey && lang(quickButtonLangKey);
  const truncatedDescription = trimText(description, MAX_TEXT_LENGTH);
  const isArticle = Boolean(truncatedDescription || title || siteName);
  let isSquarePhoto = Boolean(stickers);
  if (isArticle && webPage?.photo && !webPage.video && !webPage.document) {
    const { width, height } = calculateMediaDimensions({
      media: webPage.photo,
      isOwn: message.isOutgoing,
      isInWebPage: true,
      asForwarded,
      noAvatars,
      isMobile,
    });
    isSquarePhoto = (width === height || mediaSize === 'small') && mediaSize !== 'large';
  }
  const isMediaInteractive = (photo || video) && onMediaClick && !isSquarePhoto;

  const className = buildClassName(
    'WebPage',
    inPreview && 'in-preview',
    !isEditing && inPreview && 'interactive',
    isSquarePhoto && 'with-square-photo',
    !photo && !video && !inPreview && 'without-media',
    video && 'with-video',
    !isArticle && 'no-article',
    document && 'with-document',
    quickButtonTitle && 'with-quick-button',
    isGift && 'with-gift',
  );

  function renderQuickButton(caption: string) {
    return (
      <Button
        className="WebPage--quick-button"
        size="tiny"
        color="translucent"
        isRectangular
        onClick={handleOpenTelegramLink}
      >
        {caption}
      </Button>
    );
  }

  function renderStarGiftUnique() {
    const gift = webPage?.gift;
    if (!gift || gift.type !== 'starGiftUnique') return undefined;

    const sticker = getStickerFromGift(gift)!;
    const attributes = getGiftAttributes(gift);
    const { backdrop, pattern, model } = attributes || {};

    if (!backdrop || !pattern || !model) return undefined;

    const backgroundColors = [backdrop.centerColor, backdrop.edgeColor];

    return (
      <div
        className="web-page-gift web-page-centered web-page-unique"
        onClick={() => handleOpenTelegramLink()}
      >
        <div className="web-page-unique-background-wrapper">
          <RadialPatternBackground
            className="web-page-unique-background"
            backgroundColors={backgroundColors}
            patternColor={backdrop.patternColor}
            patternIcon={pattern.sticker}
          />
        </div>
        <div ref={giftStickersRef} key={sticker.id} className="WebPage--unique-sticker">
          <StickerView
            containerRef={giftStickersRef}
            sticker={sticker}
            size={STAR_GIFT_STICKER_SIZE}
            observeIntersectionForPlaying={observeIntersectionForPlaying}
            observeIntersectionForLoading={observeIntersectionForLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <PeerColorWrapper
      className={className}
      data-initial={(siteName || displayUrl)[0]}
      dir={oldLang.isRtl ? 'rtl' : 'auto'}
      onClick={handleContainerClick}
    >
      <div className={buildClassName(
        'WebPage--content',
        isStory && 'is-story',
        isGift && 'is-gift',
      )}
      >
        {backgroundEmojiId && (
          <EmojiIconBackground
            emojiDocumentId={backgroundEmojiId}
            className="WebPage--background-icons"
          />
        )}
        {isStory && (
          <BaseStory story={story} isProtected={isProtected} isConnected={isConnected} isPreview />
        )}
        {isGift && !inPreview && (
          renderStarGiftUnique()
        )}
        {isArticle && (
          <div
            className={buildClassName('WebPage-text', !inPreview && 'WebPage-text_interactive')}
            onClick={!inPreview ? () => openUrl({ url, shouldSkipModal: true }) : undefined}
          >
            <SafeLink className="site-name" url={url} text={siteName || displayUrl} />
            {(!inPreview || isGift) && title && (
              <p className="site-title">{renderText(title)}</p>
            )}
            {truncatedDescription && !isGift && (
              <p className="site-description">{renderText(truncatedDescription, ['emoji', 'br'])}</p>
            )}
          </div>
        )}
        {photo && !isGift && !video && !document && (
          <Photo
            photo={photo}
            isOwn={message.isOutgoing}
            isInWebPage
            observeIntersection={observeIntersectionForLoading}
            noAvatars={noAvatars}
            canAutoLoad={canAutoLoad}
            size={isSquarePhoto ? 'pictogram' : 'inline'}
            asForwarded={asForwarded}
            nonInteractive={!isMediaInteractive}
            isDownloading={isDownloading}
            isProtected={isProtected}
            theme={theme}
            onClick={isMediaInteractive ? handleMediaClick : undefined}
            onCancelUpload={onCancelMediaTransfer}
          />
        )}
        {!inPreview && video && (
          <Video
            video={video}
            isOwn={message.isOutgoing}
            isInWebPage
            observeIntersectionForLoading={observeIntersectionForLoading!}
            noAvatars={noAvatars}
            canAutoLoad={canAutoLoad}
            canAutoPlay={canAutoPlay}
            asForwarded={asForwarded}
            isDownloading={isDownloading}
            isProtected={isProtected}
            onClick={isMediaInteractive ? handleMediaClick : undefined}
            onCancelUpload={onCancelMediaTransfer}
          />
        )}
        {!inPreview && audio && (
          <Audio
            theme={theme}
            message={message}
            origin={AudioOrigin.Inline}
            noAvatars={noAvatars}
            isDownloading={isDownloading}
            onPlay={onAudioPlay}
            onCancelUpload={onCancelMediaTransfer}
          />
        )}
        {!inPreview && document && (
          <Document
            document={document}
            message={message}
            observeIntersection={observeIntersectionForLoading}
            autoLoadFileMaxSizeMb={autoLoadFileMaxSizeMb}
            onMediaClick={handleMediaClick}
            onCancelUpload={onCancelMediaTransfer}
            isDownloading={isDownloading}
            shouldWarnAboutSvg={shouldWarnAboutSvg}
          />
        )}
        {!inPreview && stickers && (
          <div
            ref={stickersRef}
            className={buildClassName(
              'media-inner', 'square-image', stickers.isEmoji && 'WebPage--emoji-grid', 'WebPage--stickers',
            )}
          >
            {stickers.documents.map((sticker) => (
              <div key={sticker.id} className="WebPage--sticker">
                <StickerView
                  containerRef={stickersRef}
                  sticker={sticker}
                  shouldLoop
                  size={stickers.isEmoji ? EMOJI_SIZE : STICKER_SIZE}
                  customColor={customColor}
                  observeIntersectionForPlaying={observeIntersectionForPlaying}
                  observeIntersectionForLoading={observeIntersectionForLoading}
                />
              </div>
            ))}
          </div>
        )}
        {inPreview && displayUrl && !isArticle && (
          <div className="WebPage-text">
            <p className="site-name">{displayUrl}</p>
            <p className="site-description">{oldLang('Chat.Empty.LinkPreview')}</p>
          </div>
        )}
      </div>
      {quickButtonTitle && renderQuickButton(quickButtonTitle)}
    </PeerColorWrapper>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    return {
      canPlayAnimatedEmojis: selectCanPlayAnimatedEmojis(global),
    };
  },
)(WebPage));
