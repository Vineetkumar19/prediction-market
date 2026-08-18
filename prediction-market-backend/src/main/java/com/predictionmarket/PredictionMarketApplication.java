package com.predictionmarket;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Prediction Market Simulator - backend entry point.
 *
 * Virtual tokens only. There is no payment code anywhere in this project and
 * none should ever be added.
 */
@SpringBootApplication
@EnableScheduling
public class PredictionMarketApplication {

    public static void main(String[] args) {
        SpringApplication.run(PredictionMarketApplication.class, args);
    }
}
