package com.bsr.bsr_booking.services.impl;

import com.bsr.bsr_booking.dtos.HotelImageDTO;
import com.bsr.bsr_booking.dtos.Response;
import com.bsr.bsr_booking.entities.HotelImage;
import com.bsr.bsr_booking.exceptions.NotFoundException;
import com.bsr.bsr_booking.repositories.HotelImageRepository;
import com.bsr.bsr_booking.services.HotelImageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeToken;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class HotelImageServiceImpl implements HotelImageService {

    private final HotelImageRepository hotelImageRepository;
    private final ModelMapper modelMapper;

    @Override
    public Response addMultipleHotelImages(List<MultipartFile> imageFiles, List<String> descriptions) {
        if (imageFiles == null || imageFiles.isEmpty()) {
            throw new IllegalArgumentException("At least one image file is required");
        }

        // Get the current max display order
        Integer maxDisplayOrder = hotelImageRepository.findMaxDisplayOrder();
        int currentOrder = (maxDisplayOrder != null ? maxDisplayOrder : 0) + 1;

        List<HotelImage> savedImages = new ArrayList<>();

        for (int i = 0; i < imageFiles.size(); i++) {
            MultipartFile file = imageFiles.get(i);
            if (file == null || file.isEmpty()) {
                continue;
            }

            String description = null;
            if (descriptions != null && i < descriptions.size()) {
                String desc = descriptions.get(i);
                // Only set description if it's not null and not empty
                if (desc != null && !desc.trim().isEmpty()) {
                    description = desc.trim();
                }
            }

            try {
                // Validate file type
                String contentType = file.getContentType();
                if (contentType == null || !contentType.startsWith("image/")) {
                    log.warn("Invalid file type: {} for file: {}", contentType, file.getOriginalFilename());
                    throw new IllegalArgumentException("File must be an image. Invalid type: " + contentType);
                }

                // Validate file size (max 10MB)
                if (file.getSize() > 10 * 1024 * 1024) {
                    log.warn("File too large: {} bytes for file: {}", file.getSize(), file.getOriginalFilename());
                    throw new IllegalArgumentException("File size exceeds 10MB limit");
                }

                HotelImage hotelImage = HotelImage.builder()
                    .fileName(file.getOriginalFilename())
                    .contentType(contentType)
                    .imageData(file.getBytes())
                    .description(description)
                    .displayOrder(currentOrder++)
                    .build();

                HotelImage saved = hotelImageRepository.save(hotelImage);
                savedImages.add(saved);
                log.info("Hotel image saved successfully: ID={}, FileName={}, DisplayOrder={}", 
                    saved.getId(), saved.getFileName(), saved.getDisplayOrder());
            } catch (IOException e) {
                log.error("Error saving hotel image: {}", e.getMessage(), e);
                throw new IllegalArgumentException("Failed to save image: " + e.getMessage());
            } catch (Exception e) {
                log.error("Unexpected error saving hotel image: {}", e.getMessage(), e);
                throw new IllegalArgumentException("Failed to save image: " + e.getMessage());
            }
        }

        List<HotelImageDTO> imageDTOs = modelMapper.map(savedImages, new TypeToken<List<HotelImageDTO>>() {}.getType());

        return Response.builder()
            .status(200)
            .message("Successfully added " + savedImages.size() + " hotel image(s)")
            .hotelImages(imageDTOs)
            .build();
    }

    @Override
    public Response getAllHotelImages() {
        try {
            List<HotelImage> images = hotelImageRepository.findAllOrderedByDisplayOrder();
            log.info("Found {} hotel images", images.size());
            
            List<HotelImageDTO> imageDTOs = modelMapper.map(images, new TypeToken<List<HotelImageDTO>>() {}.getType());

            return Response.builder()
                .status(200)
                .message("success")
                .hotelImages(imageDTOs)
                .build();
        } catch (Exception e) {
            log.error("Error fetching hotel images: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch hotel images: " + e.getMessage());
        }
    }

    @Override
    public Response getHotelImageById(Long id) {
        HotelImage image = hotelImageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Hotel image not found"));
        
        HotelImageDTO imageDTO = modelMapper.map(image, HotelImageDTO.class);

        return Response.builder()
            .status(200)
            .message("success")
            .hotelImage(imageDTO)
            .build();
    }

    @Override
    public Response updateHotelImage(Long id, MultipartFile imageFile, String description, Integer displayOrder) {
        HotelImage image = hotelImageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Hotel image not found"));

        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                image.setImageData(imageFile.getBytes());
                image.setFileName(imageFile.getOriginalFilename());
                image.setContentType(imageFile.getContentType());
            } catch (IOException e) {
                log.error("Error updating hotel image data: {}", e.getMessage());
                throw new IllegalArgumentException("Failed to update image: " + e.getMessage());
            }
        }

        if (description != null) {
            image.setDescription(description);
        }

        if (displayOrder != null) {
            image.setDisplayOrder(displayOrder);
        }

        hotelImageRepository.save(image);
        log.info("Hotel image updated: {}", id);

        HotelImageDTO imageDTO = modelMapper.map(image, HotelImageDTO.class);

        return Response.builder()
            .status(200)
            .message("Hotel image updated successfully")
            .hotelImage(imageDTO)
            .build();
    }

    @Override
    public Response deleteHotelImage(Long id) {
        if (!hotelImageRepository.existsById(id)) {
            throw new NotFoundException("Hotel image not found");
        }

        hotelImageRepository.deleteById(id);
        log.info("Hotel image deleted: {}", id);

        return Response.builder()
            .status(200)
            .message("Hotel image deleted successfully")
            .build();
    }

    @Override
    public byte[] getHotelImageData(Long id) {
        HotelImage image = hotelImageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Hotel image not found"));
        
        return image.getImageData();
    }

    @Override
    public String getHotelImageContentType(Long id) {
        HotelImage image = hotelImageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Hotel image not found"));
        
        return image.getContentType();
    }
}

