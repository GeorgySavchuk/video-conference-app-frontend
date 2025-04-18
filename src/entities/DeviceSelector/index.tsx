'use client'
import React, { useEffect, useState } from 'react'
import { useMeeting } from '@videosdk.live/react-sdk'
import { Select, SelectItem } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { Settings, Mic, Video, Headphones } from 'lucide-react'

interface Device {
  id: string
  label: string
}

export const DeviceSelector = () => {
  const { changeMic, changeWebcam } = useMeeting()
  
  const [devices, setDevices] = useState<{
    microphones: Device[]
    cameras: Device[]
    speakers: Device[]
  }>({
    microphones: [],
    cameras: [],
    speakers: []
  })

  const [selectedDevices, setSelectedDevices] = useState({
    microphone: '',
    camera: '',
    speaker: ''
  })

  const [isOpen, setIsOpen] = useState(false)

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      
      const microphones = devices
        .filter(device => device.kind === 'audioinput')
        .map(d => ({
          id: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 4)}`
        }))

      const cameras = devices
        .filter(device => device.kind === 'videoinput')
        .map(d => ({
          id: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 4)}`
        }))

      const speakers = devices
        .filter(device => device.kind === 'audiooutput')
        .map(d => ({
          id: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 4)}`
        }))

      setDevices({
        microphones,
        cameras,
        speakers
      })

      if (microphones.length > 0 && !selectedDevices.microphone) {
        setSelectedDevices(prev => ({
          ...prev,
          microphone: microphones[0].id
        }))
      }

      if (cameras.length > 0 && !selectedDevices.camera) {
        setSelectedDevices(prev => ({
          ...prev,
          camera: cameras[0].id
        }))
      }

      if (speakers.length > 0 && !selectedDevices.speaker) {
        setSelectedDevices(prev => ({
          ...prev,
          speaker: speakers[0].id
        }))
      }
    } catch (error) {
      console.error('Error enumerating devices:', error)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        getDevices()
      } catch (error) {
        console.error('Error getting user media:', error)
      }
    }

    initialize()

    const handleDeviceChange = () => {
      getDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  })

  useEffect(() => {
    if (selectedDevices.microphone) {
      changeMic(selectedDevices.microphone)
    }
    if (selectedDevices.camera) {
      changeWebcam(selectedDevices.camera)
    }

    if (selectedDevices.speaker) {
      const audioElements = document.querySelectorAll('audio')
      audioElements.forEach(audio => {
        if ('setSinkId' in audio) {
          audio.setSinkId(selectedDevices.speaker);
        }
      })
    }
  }, [selectedDevices, changeMic, changeWebcam])

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full"
      >
        <Settings className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-10 bg-background border rounded-lg shadow-lg p-4 w-64 z-50">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 opacity-70" />
              <Select
                value={selectedDevices.microphone}
                onValueChange={(value) => setSelectedDevices(prev => ({
                  ...prev,
                  microphone: value
                }))}
              >
                {devices.microphones.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 opacity-70" />
              <Select
                value={selectedDevices.camera}
                onValueChange={(value) => setSelectedDevices(prev => ({
                  ...prev,
                  camera: value
                }))}
              >
                {devices.cameras.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 opacity-70" />
              <Select
                value={selectedDevices.speaker}
                onValueChange={(value) => setSelectedDevices(prev => ({
                  ...prev,
                  speaker: value
                }))}
              >
                {devices.speakers.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}