import UserGuideContent, {
    metadata as userGuideMetadata,
    sourceCode as userGuideSourceCode,
    toc as userGuideToc
} from '../../../../../easy-onboarding/USER_GUIDE.md'
import { useMDXComponents as getMDXComponents } from '../../../../mdx-components'

const pageMetadata = {
    ...userGuideMetadata,
    filePath: 'https://github.com/Andamio-Platform/use-cases/tree/main/easy-onboarding/USER_GUIDE.md'
}

export const metadata = pageMetadata

const Wrapper = getMDXComponents().wrapper

export default function EasyOnboardingUserGuidePage(props) {
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
