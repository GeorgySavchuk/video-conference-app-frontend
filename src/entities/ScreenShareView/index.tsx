'use client'
import React, { useEffect, useRef, useMemo } from 'react'
import { useParticipant } from '@videosdk.live/react-sdk'
import ReactPlayer from 'react-player'
import { cn } from '@/shared/lib/utils'
import { BsCameraVideo } from 'react-icons/bs'

const ScreenShareView = ({ 
    participantId, 
    isLocal 
}: { 
    participantId: string, 
    isLocal: boolean 
}) => {
    const screenShareAudioRef = useRef<HTMLAudioElement>(null)
    const { 
        screenShareStream,
        screenShareOn,
        displayName
    } = useParticipant(participantId)

    const mediaStream = useMemo(() => {
        if (screenShareOn && screenShareStream) {
            const stream = new MediaStream()
            stream.addTrack(screenShareStream.track)
            return stream
        }
        return null
    }, [screenShareStream, screenShareOn])

    useEffect(() => {
        if (screenShareAudioRef.current && screenShareOn && !isLocal) {
            const audioStream = new MediaStream()
            audioStream.addTrack(screenShareStream.track)
            screenShareAudioRef.current.srcObject = audioStream
            screenShareAudioRef.current.play().catch(console.error)
        } else if (screenShareAudioRef.current) {
            screenShareAudioRef.current.srcObject = null
        }
    }, [screenShareStream, screenShareOn, isLocal])

    return (
        <div className="relative w-full aspect-video">
            <div className={cn(
                'relative w-full h-full rounded-3xl overflow-hidden',
                'border-4 border-green-500 shadow-lg shadow-green-500/50 bg-gray-900'
            )}>
                <audio ref={screenShareAudioRef} autoPlay playsInline muted={isLocal} />
                
                {screenShareOn && mediaStream ? (
                    <div className="w-full h-full">
                        <ReactPlayer
                            playsinline
                            pip={false}
                            light={false}
                            controls={false}
                            muted={true}
                            playing={true}
                            url={mediaStream}
                            width="100%"
                            height="100%"
                            style={{
                                borderRadius: '16px',
                                objectFit: 'contain'
                            }}
                            onError={console.error}
                        />
                        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full flex items-center">
                            <BsCameraVideo className="mr-2 text-green-500" size={14} />
                            <span className="text-sm font-medium">Демонстрация экрана</span>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white text-xl">
                            {displayName || (isLocal ? 'Ваш экран' : 'Экран участника')}
                        </span>
                    </div>
                )}
                
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                        {displayName || (isLocal ? 'Вы' : 'Пользователь')}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ScreenShareView