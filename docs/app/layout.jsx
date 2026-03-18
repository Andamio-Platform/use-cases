import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './global.css'

export const metadata = {
    applicationName: 'Andamio Use Cases',
    title: {
        default: 'Andamio Use Cases',
        template: '%s | Andamio Use Cases'
    },
    description: 'Practical examples and implementation guides for builders working with the Andamio ecosystem.'
}

const navbar = (
    <Navbar
        logo={(
            <span className="andamio-logo" aria-label="Andamio Use Cases">
                <span className="andamio-logo__asset" aria-hidden="true">
                    <img
                        className="andamio-logo__image andamio-logo__image--light"
                        src="/brand/andamio-logo-primary.svg"
                        alt=""
                        width="196"
                        height="36"
                    />
                    <img
                        className="andamio-logo__image andamio-logo__image--dark"
                        src="/brand/andamio-logo-primary-dark.svg"
                        alt=""
                        width="196"
                        height="36"
                    />
                </span>
                <span className="andamio-logo__context">Use Cases</span>
            </span>
        )}
        projectLink="https://github.com/Andamio-Platform/use-cases"
        align="right"
    />
)
const footer = (
    <Footer>
        <div className="andamio-footer">
            <p>
                <strong>Andamio</strong>
                {' '}
                scaffolds real implementation patterns for teams building with confidence.
            </p>
            <p>
                <a href="https://www.andamio.io">andamio.io</a>
                {' · '}
                <a href="https://github.com/Andamio-Platform/use-cases">GitHub</a>
            </p>
        </div>
    </Footer>
)

export default async function RootLayout({ children }) {
    const pageMap = await getPageMap()

    return (
        <html
            lang="en"
            dir="ltr"
            suppressHydrationWarning
        >
            <Head
                color={{
                    hue: { light: 16, dark: 14 },
                    saturation: { light: 100, dark: 100 },
                    lightness: { light: 60, dark: 66 }
                }}
                backgroundColor={{
                    light: '#FFFFFF',
                    dark: '#0F1419'
                }}
                faviconGlyph="A"
            >
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <body className="andamio-shell">
                <Layout
                    navbar={navbar}
                    pageMap={pageMap}
                    docsRepositoryBase="https://github.com/Andamio-Platform/use-cases/tree/main/docs/content"
                    footer={footer}
                    editLink={<span>Edit this page on GitHub</span>}
                    sidebar={{
                        defaultMenuCollapseLevel: 1,
                        toggleButton: true
                    }}
                    toc={{
                        title: 'On this page'
                    }}
                >
                    {children}
                </Layout>
            </body>
        </html>
    )
}
