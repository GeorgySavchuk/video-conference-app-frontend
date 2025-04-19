'use client'
import React, { useEffect, useState, useRef } from 'react'
import { BsCameraVideoFill, BsCameraVideoOffFill, BsGearFill } from "react-icons/bs"
import { FaMicrophoneSlash, FaMicrophone } from "react-icons/fa6"
import { FaPhoneAlt, FaDesktop, FaHeadphones } from "react-icons/fa"
import { useMeeting } from '@videosdk.live/react-sdk'
import { cn } from '@/shared/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner';

type Props = {
  isScreenSharing: boolean;
}

type Device = {
  deviceId: string;
  label: string;
  kind: string;
}

const Controls = ({isScreenSharing}: Props) => {
  const router = useRouter()
  const { 
    leave, 
    toggleMic, 
    toggleWebcam,
    toggleScreenShare,
    changeMic,
    changeWebcam,
    localMicOn,
    localWebcamOn,
    participants
  } = useMeeting()
  
  const [showDeviceSettings, setShowDeviceSettings] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedMic, setSelectedMic] = useState('')
  const [selectedCamera, setSelectedCamera] = useState('')
  const [selectedSpeaker, setSelectedSpeaker] = useState('')
  const [isChangingDevice, setIsChangingDevice] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const isSomeoneScreenSharing = () => {
    const participantsList = [...participants.values()];
    return participantsList.some(p => {
      const screenShareStream = Array.from(p.streams?.values() || []).find(stream => 
        stream.kind === 'share'
      );
      return screenShareStream !== undefined;
    });
  };

  const getDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      })
      stream.getTracks().forEach(track => track.stop())
      
      const devices = await navigator.mediaDevices.enumerateDevices()
      setDevices(devices)
      
      const cameras = devices.filter(d => d.kind === 'videoinput')
      const mics = devices.filter(d => d.kind === 'audioinput')
      const speakers = devices.filter(d => d.kind === 'audiooutput')
      
      if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId)
      }
      if (mics.length > 0 && !selectedMic) {
        setSelectedMic(mics[0].deviceId)
      }
      if (speakers.length > 0 && !selectedSpeaker) {
        setSelectedSpeaker(speakers[0].deviceId)
      }
    } catch (error) {
      console.error('Error getting devices:', error)
      toast.error('Ошибка доступа к устройствам')
    }
  }

  useEffect(() => {
    getDevices()
    const handleDeviceChange = () => getDevices()
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [])

  useEffect(() => {
    if (!audioRef.current || !selectedSpeaker) return
    
    const setAudioOutput = async () => {
      try {
        if ('setSinkId' in audioRef.current!) {
          await audioRef.current.setSinkId(selectedSpeaker)
        }
      } catch (error) {
        console.error('Error setting audio output:', error)
      }
    }
    
    setAudioOutput()
  }, [selectedSpeaker])

  const handleToggleCamera = async () => {
    try {
      await toggleWebcam()
    } catch (error) {
      console.error('Camera toggle error:', error)
      toast.error('Ошибка переключения камеры')
    }
  }

  const handleToggleMic = async () => {
    try {
      await toggleMic()
    } catch (error) {
      console.error('Mic toggle error:', error)
      toast.error('Ошибка переключения микрофона')
    }
  }

  const handleToggleScreenShare = async () => {
    try {
      if (isSomeoneScreenSharing() && !isScreenSharing) {
        toast.error('Только один участник может демонстрировать экран')
        return
      }
      await toggleScreenShare()
    } catch (error) {
      console.error('Screen share error:', error)
      toast.error('Ошибка при демонстрации экрана')
    }
  }

  const handleLeave = async () => {
    leave()
    router.push('/')
  }
  
  const handleMicChange = async (deviceId: string) => {
    if (!deviceId || isChangingDevice) return
    
    try {
      setIsChangingDevice(true)
      const wasMicOn = localMicOn
      if (wasMicOn) await toggleMic()
      
      await changeMic(deviceId)
      setSelectedMic(deviceId)
      
      if (wasMicOn) await toggleMic()
    } catch (error) {
      console.error('Error changing microphone:', error)
      toast.error('Ошибка смены микрофона')
    } finally {
      setIsChangingDevice(false)
    }
  }
  
  const handleCameraChange = async (deviceId: string) => {
    if (!deviceId || isChangingDevice) return
    
    try {
      setIsChangingDevice(true)
      const wasCameraOn = localWebcamOn
      if (wasCameraOn) await toggleWebcam()
      
      await changeWebcam(deviceId)
      setSelectedCamera(deviceId)
      
      if (wasCameraOn) await toggleWebcam()
    } catch (error) {
      console.error('Error changing camera:', error)
      toast.error('Ошибка смены камеры')
    } finally {
      setIsChangingDevice(false)
    }
  }

  const handleSpeakerChange = (deviceId: string) => {
    setSelectedSpeaker(deviceId)
  }

  const cameras = devices.filter(d => d.kind === 'videoinput')
  const mics = devices.filter(d => d.kind === 'audioinput')
  const speakers = devices.filter(d => d.kind === 'audiooutput')
  
  const isScreenShareDisabled = isSomeoneScreenSharing() && !isScreenSharing
  
  return (
    <>
      <audio ref={audioRef} style={{ display: 'none' }} />
      
      <div className='fixed bottom-0 left-0 w-full flex items-center justify-center p-4 md:p-6'>
        <div className='flex gap-3 md:gap-5 relative'>
          <button
            className={cn(
              'p-3 md:p-4 rounded-full text-white cursor-pointer transition-all duration-300 hover:scale-110',
              'flex items-center justify-center shadow-lg',
              localWebcamOn ? 'bg-green-400 hover:bg-green-600' : 'bg-red-600 hover:bg-red-700'
            )}
            onClick={handleToggleCamera}
            disabled={isChangingDevice}
            aria-label="Toggle camera"
          >
            {localWebcamOn ? (
              <BsCameraVideoFill className="text-xl md:text-2xl" />
            ) : (
              <BsCameraVideoOffFill className="text-xl md:text-2xl" />
            )}
          </button>

          <button
            className={cn(
              'p-3 md:p-4 rounded-full text-white cursor-pointer transition-all duration-300 hover:scale-110',
              'flex items-center justify-center shadow-lg',
              localMicOn ? 'bg-green-400 hover:bg-green-600' : 'bg-red-600 hover:bg-red-700'
            )}
            onClick={handleToggleMic}
            disabled={isChangingDevice}
            aria-label="Toggle microphone"
          >
            {localMicOn ? (
              <FaMicrophone className="text-xl md:text-2xl" />
            ) : (
              <FaMicrophoneSlash className="text-xl md:text-2xl" />
            )}
          </button>

          <button
            className={cn(
              'p-3 md:p-4 rounded-full text-white cursor-pointer transition-all duration-300 hover:scale-110',
              'flex items-center justify-center shadow-lg',
              isScreenSharing ? 'bg-green-400 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700',
              isScreenShareDisabled && 'opacity-50 cursor-not-allowed hover:scale-100'
            )}
            onClick={handleToggleScreenShare}
            disabled={isChangingDevice || isScreenShareDisabled}
            aria-label="Toggle screen share"
          >
            <FaDesktop className="text-xl md:text-2xl" />
          </button>

          <button 
            className={cn(
              'p-3 md:p-4 rounded-full text-white cursor-pointer transition-all duration-300 hover:scale-110',
              'bg-slate-600 hover:bg-slate-700 flex items-center justify-center shadow-lg',
              isChangingDevice && 'opacity-50 cursor-not-allowed hover:scale-100'
            )}
            onClick={() => setShowDeviceSettings(!showDeviceSettings)}
            disabled={isChangingDevice}
            aria-label="Device settings"
          >
            <BsGearFill className="text-xl md:text-2xl" />
          </button>

          <button 
            className={cn(
              'p-3 md:p-4 rounded-full text-white cursor-pointer transition-all duration-300 hover:scale-110',
              'bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg',
              isChangingDevice && 'opacity-50 cursor-not-allowed hover:scale-100'
            )}
            onClick={handleLeave}
            disabled={isChangingDevice}
            aria-label="Leave meeting"
          >
            <FaPhoneAlt className="text-xl md:text-2xl" />
          </button>

          {showDeviceSettings && (
            <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 p-5 rounded-xl shadow-2xl text-black dark:text-white min-w-[320px] max-w-[90vw] z-50 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold mb-4 text-center flex items-center justify-center gap-2">
                <BsGearFill className="text-blue-600" />
                Настройки устройств
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm md:text-base">
                    <BsCameraVideoFill className="text-blue-600" />
                    Камера
                  </h3>
                  <select 
                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={selectedCamera}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    disabled={isChangingDevice}
                  >
                    {cameras.map(camera => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label || `Камера ${cameras.indexOf(camera) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm md:text-base">
                    <FaMicrophone className="text-blue-600" />
                    Микрофон
                  </h3>
                  <select 
                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={selectedMic}
                    onChange={(e) => handleMicChange(e.target.value)}
                    disabled={isChangingDevice}
                  >
                    {mics.map(mic => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Микрофон ${mics.indexOf(mic) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {speakers.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm md:text-base">
                      <FaHeadphones className="text-blue-600" />
                      Наушники/колонки
                    </h3>
                    <select 
                      className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      value={selectedSpeaker}
                      onChange={(e) => handleSpeakerChange(e.target.value)}
                      disabled={isChangingDevice}
                    >
                      {speakers.map(speaker => (
                        <option key={speaker.deviceId} value={speaker.deviceId}>
                          {speaker.label || `Аудио ${speakers.indexOf(speaker) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowDeviceSettings(false)}
                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                disabled={isChangingDevice}
              >
                {isChangingDevice ? 'Применяем...' : 'Готово'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Controls