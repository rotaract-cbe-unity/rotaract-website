// ============================================
// MULTI-PROVIDER IMAGE UPLOAD MANAGER
// Rotaract Club of Coimbatore Unity
// ============================================

const UploadManager = {
    // Provider priority chain
    providers: ['cloudinary', 'supabase_storage', 'imgbb', 'freeimage'],
    
    // Current active provider (loaded from DB)
    activeProvider: 'cloudinary',
    
    // Provider configs (loaded from DB)
    configs: {},
    
    // Supabase client reference
    supabase: null,
    
    // ==========================================
    // INITIALIZATION
    // ==========================================
    async init(supabaseClient) {
        this.supabase = supabaseClient;
        await this.loadProviderConfigs();
    },
    
    async loadProviderConfigs() {
        try {
            const { data, error } = await this.supabase
                .from('storage_providers')
                .select('*')
                .eq('is_active', true)
                .order('priority', { ascending: true });
            
            if (data) {
                data.forEach(p => {
                    this.configs[p.provider_name] = p;
                });
                if (data.length > 0) {
                    this.activeProvider = data[0].provider_name;
                }
            }
        } catch (e) {
            console.warn('Failed to load provider configs, using defaults');
        }
    },
    
    // ==========================================
    // IMAGE COMPRESSION (Client-Side)
    // ==========================================
    async compressImage(file, options = {}) {
        const {
            maxWidth = 1200,
            maxHeight = 1200,
            quality = 0.80,
            outputFormat = 'image/jpeg'
        } = options;
        
        return new Promise((resolve, reject) => {
            // If file is already small enough, skip compression
            if (file.size < 50000 && file.type === 'image/jpeg') {
                resolve(file);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    
                    // Calculate new dimensions maintaining aspect ratio
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    
                    // Use high quality rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Compression failed'));
                                return;
                            }
                            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                                type: outputFormat,
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        },
                        outputFormat,
                        quality
                    );
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    },
    
    // Get compression settings based on upload type
    getCompressionSettings(type) {
        const settings = {
            poster: { maxWidth: 1200, quality: 0.75 },
            photo: { maxWidth: 1600, quality: 0.80 },
            report_photo: { maxWidth: 1400, quality: 0.75 },
            profile: { maxWidth: 500, quality: 0.80 },
            signature: { maxWidth: 400, quality: 0.70 },
            receipt: { maxWidth: 1000, quality: 0.75 },
            bulletin_cover: { maxWidth: 800, quality: 0.75 },
            meeting_poster: { maxWidth: 1200, quality: 0.75 },
            meeting_photo: { maxWidth: 1400, quality: 0.75 },
            thumbnail: { maxWidth: 300, quality: 0.70 }
        };
        return settings[type] || settings.photo;
    },
    
    // ==========================================
    // MAIN UPLOAD FUNCTION (With Fallback Chain)
    // ==========================================
    async upload(file, options = {}) {
        const {
            type = 'photo',
            folder = 'unity',
            referenceTable = null,
            referenceId = null,
            bucket = null
        } = options;
        
        const startTime = Date.now();
        const originalSize = file.size;
        
        // Step 1: Compress
        const compressionSettings = this.getCompressionSettings(type);
        let compressedFile;
        try {
            compressedFile = await this.compressImage(file, compressionSettings);
        } catch (e) {
            compressedFile = file; // Use original if compression fails
        }
        
        const compressedSize = compressedFile.size;
        
        // Step 2: Try providers in priority order
        const providersToTry = [...this.providers];
        let lastError = null;
        let fallbackFrom = null;
        
        for (const providerName of providersToTry) {
            const providerConfig = this.configs[providerName];
            
            // Skip inactive providers
            if (providerConfig && !providerConfig.is_active) continue;
            if (providerConfig && !providerConfig.is_healthy) continue;
            if (providerConfig && providerConfig.current_daily_uploads >= providerConfig.daily_upload_limit) continue;
            
            try {
                const result = await this.uploadToProvider(providerName, compressedFile, {
                    type, folder, bucket
                });
                
                const duration = Date.now() - startTime;
                
                // Log successful upload
                await this.logUpload({
                    filename: file.name,
                    originalSize,
                    compressedSize,
                    provider: providerName,
                    url: result.url,
                    publicId: result.publicId,
                    folder: result.folder || folder,
                    type,
                    referenceTable,
                    referenceId,
                    duration,
                    status: fallbackFrom ? 'fallback_used' : 'success',
                    fallbackFrom
                });
                
                return {
                    url: result.url,
                    publicId: result.publicId,
                    provider: providerName,
                    originalSize,
                    compressedSize,
                    compressionRatio: (compressedSize / originalSize).toFixed(2),
                    thumbnailUrl: this.getThumbnailUrl(result.url, providerName)
                };
                
            } catch (error) {
                console.warn(`Upload to ${providerName} failed:`, error.message);
                lastError = error;
                fallbackFrom = providerName;
                
                // Log failure
                await this.logUpload({
                    filename: file.name,
                    originalSize,
                    compressedSize,
                    provider: providerName,
                    url: '',
                    publicId: '',
                    folder,
                    type,
                    referenceTable,
                    referenceId,
                    duration: Date.now() - startTime,
                    status: 'failed',
                    error: error.message
                });
                
                // Mark provider unhealthy after 3 consecutive failures
                if (providerConfig && providerConfig.error_count >= 3) {
                    await this.markProviderUnhealthy(providerName);
                }
                
                continue; // Try next provider
            }
        }
        
        // All providers failed
        throw new Error(`All storage providers failed. Last error: ${lastError?.message}`);
    },
    
    // ==========================================
    // PROVIDER-SPECIFIC UPLOAD FUNCTIONS
    // ==========================================
    
    // --- CLOUDINARY ---
    async uploadToCloudinary(file, options = {}) {
        const config = this.configs.cloudinary?.config || {};
        const cloudName = config.cloud_name || 'duoy1cje9';
        const uploadPreset = config.upload_preset || 'unity_unsigned';
        const folder = options.folder || config.folder || 'unity';
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);
        formData.append('transformation', 'q_auto,f_auto');
        
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: 'POST', body: formData }
        );
        
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Cloudinary upload failed: ${err}`);
        }
        
        const data = await response.json();
        return {
            url: data.secure_url,
            publicId: data.public_id,
            folder: data.folder
        };
    },
    
    // --- SUPABASE STORAGE ---
    async uploadToSupabase(file, options = {}) {
        if (!this.supabase) throw new Error('Supabase client not initialized');
        
        const bucketMap = {
            poster: 'posters',
            photo: 'photos',
            report_photo: 'event-reports',
            profile: 'profiles',
            signature: 'signatures',
            receipt: 'receipts',
            bulletin_cover: 'bulletins',
            meeting_poster: 'posters',
            meeting_photo: 'meeting-photos',
            thumbnail: 'photos'
        };
        
        const bucket = options.bucket || bucketMap[options.type] || 'photos';
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${options.folder || 'general'}/${fileName}`;
        
        const { data, error } = await this.supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '31536000',
                upsert: false,
                contentType: file.type || 'image/jpeg'
            });
        
        if (error) throw new Error(`Supabase upload failed: ${error.message}`);
        
        const { data: urlData } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
        
        return {
            url: urlData.publicUrl,
            publicId: filePath,
            folder: bucket
        };
    },
    
    // --- IMGBB ---
    async uploadToImgBB(file, options = {}) {
        const config = this.configs.imgbb?.config || {};
        const apiKey = config.api_key;
        
        if (!apiKey) throw new Error('ImgBB API key not configured');
        
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', apiKey);
        if (config.expiration_days > 0) {
            formData.append('expiration', config.expiration_days * 86400);
        }
        
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('ImgBB upload failed');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error?.message || 'ImgBB upload failed');
        
        return {
            url: data.data.url,
            publicId: data.data.id,
            folder: 'imgbb'
        };
    },
    
    // --- FREEIMAGE.HOST ---
    async uploadToFreeImage(file, options = {}) {
        const config = this.configs.freeimage?.config || {};
        const apiKey = config.api_key;
        
        if (!apiKey) throw new Error('FreeImage API key not configured');
        
        const formData = new FormData();
        formData.append('source', file);
        formData.append('key', apiKey);
        formData.append('format', 'json');
        
        const response = await fetch('https://freeimage.host/api/1/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('FreeImage upload failed');
        
        const data = await response.json();
        if (data.status_code !== 200) throw new Error(data.error?.message || 'FreeImage upload failed');
        
        return {
            url: data.image.url,
            publicId: data.image.id,
            folder: 'freeimage'
        };
    },
    
    // ==========================================
    // ROUTER: Calls correct provider function
    // ==========================================
    async uploadToProvider(providerName, file, options) {
        switch (providerName) {
            case 'cloudinary':
                return this.uploadToCloudinary(file, options);
            case 'supabase_storage':
                return this.uploadToSupabase(file, options);
            case 'imgbb':
                return this.uploadToImgBB(file, options);
            case 'freeimage':
                return this.uploadToFreeImage(file, options);
            default:
                throw new Error(`Unknown provider: ${providerName}`);
        }
    },
    
    // ==========================================
    // THUMBNAIL URL GENERATION
    // ==========================================
    getThumbnailUrl(url, provider, width = 300) {
        if (!url) return '';
        
        switch (provider) {
            case 'cloudinary':
                // Cloudinary on-the-fly transformation
                return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto,c_fill/`);
            case 'supabase_storage':
                // Supabase doesn't support transforms, return original
                return url;
            case 'imgbb':
                // ImgBB thumbnail
                return url.replace('https://i.ibb.co/', `https://i.ibb.co/`);
            default:
                return url;
        }
    },
    
    // ==========================================
    // DELETE IMAGE (Provider-Aware)
    // ==========================================
    async deleteImage(url, publicId, provider) {
        try {
            switch (provider) {
                case 'cloudinary':
                    // Cloudinary deletion requires signed request (do via edge function)
                    console.log('Cloudinary delete requested for:', publicId);
                    break;
                case 'supabase_storage':
                    if (this.supabase && publicId) {
                        const parts = publicId.split('/');
                        const bucket = parts[0];
                        const path = parts.slice(1).join('/');
                        await this.supabase.storage.from(bucket).remove([path]);
                    }
                    break;
                case 'imgbb':
                    // ImgBB images auto-expire or need API delete
                    console.log('ImgBB delete requested for:', publicId);
                    break;
                case 'freeimage':
                    console.log('FreeImage delete requested for:', publicId);
                    break;
            }
        } catch (e) {
            console.warn('Image deletion failed:', e.message);
        }
    },
    
    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================
    async logUpload(data) {
        try {
            await this.supabase.from('upload_log').insert({
                original_filename: data.filename,
                original_size_bytes: data.originalSize,
                compressed_size_bytes: data.compressedSize,
                compression_ratio: data.originalSize > 0 
                    ? (data.compressedSize / data.originalSize) 
                    : 0,
                provider_used: data.provider,
                provider_url: data.url,
                provider_public_id: data.publicId,
                bucket_or_folder: data.folder,
                upload_type: data.type,
                reference_table: data.referenceTable,
                reference_id: data.referenceId,
                upload_duration_ms: data.duration,
                status: data.status,
                fallback_from: data.fallbackFrom,
                error_message: data.error
            });
        } catch (e) {
            console.warn('Failed to log upload:', e.message);
        }
    },
    
    async markProviderUnhealthy(providerName) {
        try {
            await this.supabase
                .from('storage_providers')
                .update({ is_healthy: false })
                .eq('provider_name', providerName);
        } catch (e) {
            console.warn('Failed to mark provider unhealthy');
        }
    },
    
    async markProviderHealthy(providerName) {
        try {
            await this.supabase
                .from('storage_providers')
                .update({ is_healthy: true, error_count: 0 })
                .eq('provider_name', providerName);
        } catch (e) {
            console.warn('Failed to mark provider healthy');
        }
    },
    
    // Get storage usage stats
    async getStorageStats() {
        try {
            const { data } = await this.supabase
                .from('upload_log')
                .select('provider_used, compressed_size_bytes, status')
                .eq('status', 'success');
            
            const stats = {};
            if (data) {
                data.forEach(row => {
                    if (!stats[row.provider_used]) {
                        stats[row.provider_used] = { count: 0, sizeBytes: 0 };
                    }
                    stats[row.provider_used].count++;
                    stats[row.provider_used].sizeBytes += row.compressed_size_bytes || 0;
                });
            }
            
            // Convert to MB
            Object.keys(stats).forEach(key => {
                stats[key].sizeMB = (stats[key].sizeBytes / 1048576).toFixed(2);
            });
            
            return stats;
        } catch (e) {
            return {};
        }
    },
    
    // Validate file before upload
    validateFile(file, maxSizeMB = 10) {
        const errors = [];
        
        if (!file) {
            errors.push('No file selected');
            return { valid: false, errors };
        }
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            errors.push(`File type ${file.type} not allowed. Use JPEG, PNG, WebP, or GIF.`);
        }
        
        if (file.size > maxSizeMB * 1048576) {
            errors.push(`File too large (${(file.size / 1048576).toFixed(1)}MB). Max: ${maxSizeMB}MB`);
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    // Format file size for display
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// Export for use in other modules
window.UploadManager = UploadManager;