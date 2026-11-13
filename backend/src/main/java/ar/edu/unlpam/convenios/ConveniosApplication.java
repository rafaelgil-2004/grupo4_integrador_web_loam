package ar.edu.unlpam.convenios;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ConveniosApplication {

	public static void main(String[] args) {
		SpringApplication.run(ConveniosApplication.class, args);
	}

}
