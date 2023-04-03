import {useElementRect, Box, Card, Flex, LayerProvider} from '@sanity/ui'
import React, {useMemo, useCallback, forwardRef} from 'react'
import {usePane} from './usePane'
import {Layout, Root, TabsBox, TitleCard, TitleTextSkeleton, TitleText} from './PaneHeader.styles'
import {LegacyLayerProvider} from 'sanity'

interface PaneHeaderProps {
  actions?: React.ReactNode
  backButton?: React.ReactNode
  content?: React.ReactNode
  loading?: boolean
  subActions?: React.ReactNode
  tabIndex?: number
  tabs?: React.ReactNode
  title: React.ReactNode
}

/**
 * @beta This API will change. DO NOT USE IN PRODUCTION.
 */
export const PaneHeader = forwardRef(function PaneHeader(
  props: PaneHeaderProps,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const {actions, backButton, content, loading, subActions, tabs, tabIndex, title} = props
  const {collapse, collapsed, expand, rootElement: paneElement} = usePane()
  const paneRect = useElementRect(paneElement || null)

  const layoutStyle = useMemo(
    () => ({
      width: collapsed ? paneRect?.height || window.innerHeight : undefined,
    }),
    [collapsed, paneRect]
  )

  const handleTitleClick = useCallback(() => {
    if (collapsed) return
    collapse()
  }, [collapse, collapsed])

  const handleLayoutClick = useCallback(() => {
    if (!collapsed) return
    expand()
  }, [collapsed, expand])

  return (
    <LayerProvider zOffset={100}>
      <Root data-collapsed={collapsed ? '' : undefined} data-testid="pane-header" ref={ref}>
        <LegacyLayerProvider zOffset="paneHeader">
          <Card data-collapsed={collapsed ? '' : undefined} tone="inherit">
            <Layout
              onClick={handleLayoutClick}
              padding={2}
              paddingBottom={tabs ? 0 : 2}
              sizing="border"
              style={layoutStyle}
            >
              {backButton}

              <TitleCard
                __unstable_focusRing
                flex={1}
                forwardedAs="button"
                onClick={handleTitleClick}
                paddingLeft={backButton ? 1 : 3}
                paddingY={3}
                tabIndex={tabIndex}
              >
                {loading && <TitleTextSkeleton animated radius={1} />}
                {!loading && (
                  <TitleText textOverflow="ellipsis" weight="semibold">
                    {title}
                  </TitleText>
                )}
              </TitleCard>

              {actions && (
                <Box hidden={collapsed} paddingLeft={1}>
                  <LegacyLayerProvider zOffset="paneHeader">{actions}</LegacyLayerProvider>
                </Box>
              )}
            </Layout>

            {(tabs || subActions) && (
              <Flex align="center" hidden={collapsed} paddingRight={3} paddingY={1} overflow="auto">
                <TabsBox flex={1} marginRight={subActions ? 3 : 0}>
                  {tabs}
                </TabsBox>

                {subActions && <Box paddingY={2}>{subActions}</Box>}
              </Flex>
            )}

            {!collapsed && content && content}
          </Card>
        </LegacyLayerProvider>
      </Root>
    </LayerProvider>
  )
})
