'use client'
import React, { useEffect, useMemo, useRef } from 'react'
import { useParticipant } from '@videosdk.live/react-sdk'
import ReactPlayer from 'react-player'
import { cn } from '@/shared/lib/utils'
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa'
import { BsCameraVideo, BsCameraVideoOff } from 'react-icons/bs'

type Props = {
  participantId: string
  isActiveSpeaker: boolean
  mirrored?: boolean
}

const SoundWave = () => (
  <div className="flex items-center ml-2 space-x-1">
    {[1, 2, 3, 2, 1].map((height, index) => (
      <div 
        key={index}
        className="w-1 bg-blue-400 rounded-full animate-soundwave"
        style={{
          height: `${height * 3}px`,
          animationDelay: `${index * 0.1}s`
        }}
      />
    ))}
  </div>
)

const ParticipantView = ({ 
  participantId, 
  isActiveSpeaker,
  mirrored = true
}: Props) => {
  const micRef = useRef<HTMLAudioElement>(null)
  const { 
    webcamStream, 
    micStream, 
    webcamOn, 
    micOn, 
    isLocal, 
    displayName 
  } = useParticipant(participantId)

  const videoStream = useMemo(() => {
    if (webcamOn && webcamStream) {
      const stream = new MediaStream()
      stream.addTrack(webcamStream.track.clone())
      return stream
    }
    return null
  }, [webcamStream, webcamOn])

  useEffect(() => {
    if (!micRef.current) return
    
    if (micOn && micStream) {
      const mediaStream = new MediaStream()
      mediaStream.addTrack(micStream.track.clone())
      micRef.current.srcObject = mediaStream
      micRef.current.play().catch(console.error)
    } else {
      micRef.current.srcObject = null
    }
    
    return () => {
      if (micRef.current) {
         // eslint-disable-next-line react-hooks/exhaustive-deps
        micRef.current.srcObject = null
      }
    }
  }, [micStream, micOn])

  return (
    <div className="relative w-full aspect-video">
      <div className={cn(
        'relative w-full h-full rounded-3xl overflow-hidden transition-all duration-300',
        isActiveSpeaker ? 'border-4 border-blue-500 shadow-lg shadow-blue-500/50' : 'border-2 border-gray-600'
      )}>
        <audio ref={micRef} autoPlay playsInline muted={isLocal} />
        
        {webcamOn && videoStream ? (
          <div className={cn(
            "w-full h-full",
            mirrored ? "transform scale-x-[-1]" : ""
          )}>
            <ReactPlayer
              playsinline
              pip={false}
              light={false}
              controls={false}
              muted={true}
              playing={true}
              url={videoStream}
              width="100%"
              height="100%"
              style={{
                borderRadius: '12px',
                objectFit: 'cover'
              }}
              onError={console.error}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-2xl">
            <span className="text-white text-xl">{displayName || 'Пользователь'}</span>
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div className="flex items-center bg-black bg-opacity-50 text-white px-2 py-1 rounded">
            {displayName || (isLocal ? 'Вы' : 'Пользователь')}
            {isActiveSpeaker && <SoundWave />}
          </div>
          
          {!isLocal && (
            <div className="flex gap-2 bg-black bg-opacity-50 p-1 rounded">
              <div className={cn(
                "p-1 rounded-full",
                micOn ? "text-green-400" : "text-red-400"
              )}>
                {micOn ? <FaMicrophone size={14} /> : <FaMicrophoneSlash size={14} />}
              </div>
              <div className={cn(
                "p-1 rounded-full",
                webcamOn ? "text-green-400" : "text-red-400"
              )}>
                {webcamOn ? <BsCameraVideo size={14} /> : <BsCameraVideoOff size={14} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ParticipantView