import {useElementRect, Box, Card, Flex, LayerProvider} from '@sanity/ui'
import React, {useMemo, useCallback, forwardRef} from 'react'
import {usePane} from './usePane'
import {Layout, Root, TabsBox, TitleBox, TitleTextSkeleton, TitleText} from './PaneHeader.styles'
import {LegacyLayerProvider} from 'sanity'

/**
 * @beta This API will change. DO NOT USE IN PRODUCTION.
 */
export interface PaneHeaderProps {
  actions?: React.ReactNode
  backButton?: React.ReactNode
  loading?: boolean
  subActions?: React.ReactNode
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
  const {actions, backButton, loading, subActions, tabs, title} = props
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

  const showTabsOrSubActions = Boolean(!collapsed && (tabs || subActions))

  return (
    <LayerProvider zOffset={100}>
      <Root data-collapsed={collapsed ? '' : undefined} data-testid="pane-header" ref={ref}>
        <LegacyLayerProvider zOffset="paneHeader">
          <Card data-collapsed={collapsed ? '' : undefined} tone="inherit">
            <Layout
              onClick={handleLayoutClick}
              padding={2}
              paddingBottom={showTabsOrSubActions ? 0 : 2}
              sizing="border"
              style={layoutStyle}
            >
              {backButton && (
                <Box flex="none" padding={1}>
                  {backButton}
                </Box>
              )}

              <TitleBox
                flex={1}
                onClick={handleTitleClick}
                paddingTop={3}
                paddingLeft={backButton ? 0 : 3}
                paddingBottom={showTabsOrSubActions ? 2 : 3}
              >
                {loading && <TitleTextSkeleton animated radius={1} />}
                {!loading && (
                  <TitleText tabIndex={0} textOverflow="ellipsis" weight="semibold">
                    {title}
                  </TitleText>
                )}
              </TitleBox>

              {actions && (
                <Box flex="none" hidden={collapsed}>
                  <LegacyLayerProvider zOffset="paneHeader">{actions}</LegacyLayerProvider>
                </Box>
              )}
            </Layout>

            {showTabsOrSubActions && (
              <Flex
                align="center"
                hidden={collapsed}
                paddingTop={1}
                paddingRight={2}
                paddingBottom={2}
                paddingLeft={3}
                overflow="auto"
              >
                <TabsBox flex={1} marginRight={subActions ? 3 : 0}>
                  <div>{tabs}</div>
                </TabsBox>

                {subActions && <Box flex="none">{subActions}</Box>}
              </Flex>
            )}
          </Card>
        </LegacyLayerProvider>
      </Root>
    </LayerProvider>
  )
})
