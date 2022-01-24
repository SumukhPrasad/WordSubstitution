<script>
	import WordInput from "./components/WordInput.svelte";
	import WordMeanings from "./components/WordMeanings.svelte";
</script>

<svelte:head>
	<style>
		html {
			width: 620px;
			height: 220px;
		}

		body {
			width: 600px;
			height: 200px;
		}
	</style>
</svelte:head>
<main>
	<WordInput />
	<WordMeanings />
</main>

<style>
	main {
		width: 100%;
		height: 100%;
		background-color: #eee;
		display: grid;
		grid-template-columns: 200px auto;
		column-gap: 15px;
		font-size: 15px;
	}
</style>