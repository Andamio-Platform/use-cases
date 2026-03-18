import UserGuideContent, {
    metadata as userGuideMetadata,
    sourceCode as userGuideSourceCode,
    toc as userGuideToc
} from '../../../../../discord-role-gating/USER_GUIDE.md'
import { useMDXComponents as getMDXComponents } from '../../../../mdx-components'

const pageMetadata = {
    ...userGuideMetadata,
    filePath: 'https://github.com/Andamio-Platform/use-cases/tree/main/discord-role-gating/USER_GUIDE.md'
}

export const metadata = pageMetadata

const Wrapper = getMDXComponents().wrapper

export default function DiscordRoleGatingUserGuidePage(props) {
    return (
        <Wrapper
            toc={userGuideToc}
            metadata={pageMetadata}
            sourceCode={userGuideSourceCode}
        >
            <UserGuideContent {...props} />
        </Wrapper>
    )
}
