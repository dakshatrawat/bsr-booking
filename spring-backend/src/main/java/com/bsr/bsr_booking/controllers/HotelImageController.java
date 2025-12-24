package com.bsr.bsr_booking.controllers;

import com.bsr.bsr_booking.dtos.Response;
import com.bsr.bsr_booking.services.HotelImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/hotel-images")
@RequiredArgsConstructor
public class HotelImageController {

    private final HotelImageService hotelImageService;

    @PostMapping(
            value = "/add-multiple",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Response> addMultipleHotelImages(
            @RequestParam("imageFiles") List<MultipartFile> imageFiles,
            @RequestParam(value = "descriptions", required = false) List<String> descriptions
    ) {
        try {
            Response response = hotelImageService.addMultipleHotelImages(imageFiles, descriptions);
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(response);
        } catch (Exception e) {
            Response errorResponse = Response.builder()
                    .status(500)
                    .message("Error uploading images: " + e.getMessage())
                    .build();
            return ResponseEntity.status(500).contentType(MediaType.APPLICATION_JSON).body(errorResponse);
        }
    }

    @GetMapping(value = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Response> getAllHotelImages() {
        try {
            Response response = hotelImageService.getAllHotelImages();
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(response);
        } catch (Exception e) {
            Response errorResponse = Response.builder()
                    .status(500)
                    .message("Error fetching images: " + e.getMessage())
                    .build();
            return ResponseEntity.status(500).contentType(MediaType.APPLICATION_JSON).body(errorResponse);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Response> getHotelImageById(@PathVariable Long id) {
        return ResponseEntity.ok(hotelImageService.getHotelImageById(id));
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getHotelImageData(@PathVariable Long id) {
        try {
            byte[] imageData = hotelImageService.getHotelImageData(id);
            String contentType = hotelImageService.getHotelImageContentType(id);
            
            HttpHeaders headers = new HttpHeaders();
            if (contentType != null && !contentType.isEmpty()) {
                headers.setContentType(MediaType.parseMediaType(contentType));
            } else {
                headers.setContentType(MediaType.IMAGE_JPEG); // Default to JPEG
            }
            
            // Add CORS headers
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
            headers.set("Access-Control-Allow-Headers", "*");
            headers.setContentLength(imageData.length);
            
            return new ResponseEntity<>(imageData, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PutMapping(
            value = "/update/{id}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Response> updateHotelImage(
            @PathVariable Long id,
            @RequestParam(value = "imageFile", required = false) MultipartFile imageFile,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "displayOrder", required = false) Integer displayOrder
    ) {
        return ResponseEntity.ok(hotelImageService.updateHotelImage(id, imageFile, description, displayOrder));
    }

    @DeleteMapping("/delete/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Response> deleteHotelImage(@PathVariable Long id) {
        return ResponseEntity.ok(hotelImageService.deleteHotelImage(id));
    }
}

