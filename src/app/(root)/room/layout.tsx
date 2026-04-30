import React, {ReactNode} from 'react';

type Props = {
    children: ReactNode;
}

const MeetingLayout = ({children}: Props) => {
    return (
        <main className="relative m-0 flex h-[100dvh] max-h-[100dvh] min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden bg-gradient-to-br from-[#0c0e14] via-[#12151f] to-[#161925] p-0">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </main>
    )
}

export default MeetingLayout;