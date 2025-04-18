'use client'
import React, { useEffect, useState } from 'react'
import { useMeeting, useMediaDevice } from '@videosdk.live/react-sdk'
import { Select, SelectItem } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { Settings, Mic, Video, Headphones } from 'lucide-react'

interface Device {
  id: string
  label: string
}

export const DeviceSelector = () => {
  const { 
    changeMic,
    changeWebcam,
    changeAudioOutput,
    getMicrophones,
    getCameras,
    getAudioOutputDevices
  } = useMeeting()
  
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

  // Загрузка устройств
  const loadDevices = async () => {
    try {
      const [mics, cams, speakers] = await Promise.all([
        getMicrophones(),
        getCameras(),
        getAudioOutputDevices()
      ])

      setDevices({
        microphones: mics.map(d => ({
          id: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 4)}`
        })),
        cameras: cams.map(d => ({
          id: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 4)}`
        })),
        speakers: speakers.map(d => ({
          id: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 4)}`
        }))
      })

      // Автовыбор устройств по умолчанию
      if (mics.length > 0 && !selectedDevices.microphone) {
        setSelectedDevices(prev => ({
          ...prev,
          microphone: mics[0].deviceId
        }))
      }

      if (cams.length > 0 && !selectedDevices.camera) {
        setSelectedDevices(prev => ({
          ...prev,
          camera: cams[0].deviceId
        }))
      }

      if (speakers.length > 0 && !selectedDevices.speaker) {
        setSelectedDevices(prev => ({
          ...prev,
          speaker: speakers[0].deviceId
        }))
      }
    } catch (error) {
      console.error('Error loading devices:', error)
    }
  }

  // Первоначальная загрузка и подписка на изменения
  useEffect(() => {
    loadDevices()

    const handleDeviceChange = () => {
      loadDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [])

  // Обновление устройств при изменении выбора
  useEffect(() => {
    const updateDevices = async () => {
      try {
        if (selectedDevices.microphone) {
          await changeMic(selectedDevices.microphone)
        }
        if (selectedDevices.camera) {
          await changeWebcam(selectedDevices.camera)
        }
        if (selectedDevices.speaker) {
          await changeAudioOutput(selectedDevices.speaker)
        }
      } catch (error) {
        console.error('Error changing devices:', error)
      }
    }

    updateDevices()
  }, [selectedDevices])

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