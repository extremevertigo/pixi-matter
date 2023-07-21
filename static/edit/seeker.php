<?php
	
	$dir = $_GET['mediaPath'];
	$files = array();
	$excludeFiles = array();

	// echo realpath($dir) . '<br />';
	// echo dirname(dirname(realpath($dir))) . '<br />';

	function getDirContents($dir, &$results = array())
	{
		$files = scandir($dir);

		foreach ( $files as $file )
		{
			if ( $file[0] === '.' )
				continue;

			$path = realpath($dir . DIRECTORY_SEPARATOR . $file);

			if ( !is_dir($path) )
				$results[] = $path;

			else if ( $file !== '.' && $file !== '..' )
				getDirContents($path, $results);
		}

		return $results;
	}

	$dirFiles = getDirContents($dir);

	// we only want to keep the files that are json, and images, BUT not sprite sheet images
	foreach ( $dirFiles as $file )
	{
		$info = pathinfo($file);

		// possible sprite sheet
		if ( $info['extension'] === 'json' )
		{
			$json = json_decode( file_get_contents($file) );

			// its a texture packer! remove the images
			if ( $json->texturepacker )
			// if ( $json->texturepacker && is_array($json->images) && is_array($json->frames) )
			{
				foreach ( $json->images as $image )
					// $excludeFiles[] = $image;
					$excludeFiles[] = dirname(realpath($dir)) . DIRECTORY_SEPARATOR . $image;
			}
			// its some other we don't need
			else
				$excludeFiles[] = $file;
		} 
		// not an image, don't need it
		else if ( !(preg_match("/(jpeg|jpg|gif|png)$/i", $file, $matches)) )
			$excludeFiles[] = $file;
	}

	// remove sprite sheet images from array
	foreach ( $excludeFiles as $file )
	{
		// echo $file . '<br />';
		if ( ($key = array_search($file, $dirFiles)) !== false )
			unset($dirFiles[$key]);
	}

	// make the path cleaner
	foreach ( $dirFiles as $x => $file )
		// $files[] = $file;
		// $files[] = dirname(realpath($dir)) . $file;
		$files[] = str_replace(dirname(realpath($dir)) . DIRECTORY_SEPARATOR, '', $file);

	// output it!
	// echo '<pre>' . print_r($files, true) . '</pre>';
	echo json_encode($files);