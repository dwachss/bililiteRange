# concatenates files 

$targets = @{
	"editor.js" = @(
		"dwachss/historystack/history.js",
		"dwachss/keymap/keymap.js",
		"dwachss/status/status.js",
		"dwachss/toolbar/toolbar.js",
		"bililiteRange.js",
		"bililiteRange.undo.js",
		"bililiteRange.lines.js",
		"bililiteRange.find.js",
		"bililiteRange.ex.js",
		"bililiteRange.evim.js"
	);
	"bililiteRange.js" = @(
		"bililiteRange.js",
		"bililiteRange.find.js"
	)
}

$shaSize = 7

function Get-Sha {
	param($repo)
	if ($repo) {
		[char[]]((Invoke-WebRequest https://api.github.com/repos/$repo/commits/master -H @{Accept = 'application/vnd.github.sha'}).Content[0..$shaSize]) -join ''
	}else{
		git rev-parse --short=$shaSize HEAD
	}
}

function Get-Source-Content {
	param($repo, $file)
	if ($repo){
		(Invoke-WebRequest https://raw.githubusercontent.com/$repo/master/$file).Content
	}else{
		Get-Content $file
	}
}

foreach ($target in $targets.Keys){
	"// $target $( Get-Date -Format 'yyyy-MM-dd')" > dist/$target
	foreach ($source in $targets[$target]){
		$repo = (Split-Path $source) -replace '\\', '/'
		$file = Split-Path $source -leaf
		"" >> dist/$target
		"// $source commit $(Get-Sha $repo)" >>  dist/$target
		Get-Source-Content $repo $file >> dist/$target
	}
}
