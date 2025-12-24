package com.bsr.bsr_booking.services;

import com.bsr.bsr_booking.dtos.Response;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface HotelImageService {
    
    Response addMultipleHotelImages(List<MultipartFile> imageFiles, List<String> descriptions);
    Response getAllHotelImages();
    Response getHotelImageById(Long id);
    Response updateHotelImage(Long id, MultipartFile imageFile, String description, Integer displayOrder);
    Response deleteHotelImage(Long id);
    byte[] getHotelImageData(Long id);
    String getHotelImageContentType(Long id);
}

