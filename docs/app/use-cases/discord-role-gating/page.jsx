import ReadmeContent, {
    metadata as readmeMetadata,
    sourceCode as readmeSourceCode,
    toc as readmeToc
} from '../../../../discord-role-gating/README.md'
import { useMDXComponents as getMDXComponents } from '../../../mdx-components'

const pageMetadata = {
    ...readmeMetadata,
    filePath: 'https://github.com/Andamio-Platform/use-cases/tree/main/discord-role-gating/README.md'
}

export const metadata = pageMetadata

const Wrapper = getMDXComponents().wrapper

export default function DiscordRoleGatingPage(props) {
    return (
        <Wrapper
            toc={readmeToc}
            metadata={pageMetadata}
            sourceCode={readmeSourceCode}
        >
            <ReadmeContent {...props} />
        </Wrapper>
    )
}
