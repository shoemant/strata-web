'use client'

import React, { useEffect, useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { FileManager } from '@cubone/react-file-manager'
import '@cubone/react-file-manager/dist/style.css'

export default function DocumentsPanel({ buildingId }) {
    const supabase = useSupabaseClient()
    const [files, setFiles] = useState([])

    // Load documents and map to FileManager format
    const loadFiles = async () => {
        const { data, error } = await supabase
            .from('documents')
            .select('id, title, folder, url, size, updated_at')
            .eq('building_id', buildingId)

        if (error) {
            console.error('Error loading documents:', error.message)
            return
        }

        const mapped = data.map(d => ({
            name: d.title,
            path: d.url,
            isDirectory: !d.title && Boolean(d.folder),
            size: d.size || 0,
            dateModified: new Date(d.updated_at)
        }))

        setFiles(mapped)
    }

    useEffect(() => {
        if (buildingId) loadFiles()
    }, [buildingId])

    // FileManager event handlers
    const handlers = {
        onCreateFolder: async (folderName, parent) => {
            const folderPath = parent ? `${parent.path}/${folderName}` : folderName
            const { error } = await supabase
                .from('documents')
                .insert({ building_id: buildingId, title: '', url: '', folder: folderPath })
            if (error) console.error('Error creating folder:', error.message)
            loadFiles()
        },

        onDelete: async items => {
            for (const item of items) {
                if (!item.isDirectory) {
                    await supabase.storage.from('documents').remove([item.path])
                }
                await supabase
                    .from('documents')
                    .delete()
                    .eq('building_id', buildingId)
                    .eq('url', item.path)
            }
            loadFiles()
        },

        onUpload: async (file, parent) => {
            const folder = parent ? parent.path : ''
            const filePath = folder ? `${folder}/${file.name}` : file.name
            const { error: uploadError } = await supabase
                .storage
                .from('documents')
                .upload(filePath, file)
            if (uploadError) console.error('Upload error:', uploadError.message)

            const { error: dbError } = await supabase
                .from('documents')
                .insert({ building_id: buildingId, title: file.name, url: filePath, folder })
            if (dbError) console.error('DB error:', dbError.message)

            loadFiles()
        }
    }

    return (
        <div style={{ height: '600px' }}>
            <FileManager
                files={files}
                eventHandlers={handlers}
                allowUpload
                allowDelete
                allowCreateFolder
            />
        </div>
    )
}
